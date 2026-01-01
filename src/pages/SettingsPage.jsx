const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for File Uploads (Logo & Backup)
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => cb(null, 'logo-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for backups
});

// --- EXISTING ROUTES (Rates, Types, Items, Business) ---
// (Keep your existing routes for rates, types, items here...)

router.get('/rates', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM daily_rates');
        const rates = {};
        result.rows.forEach(r => rates[r.metal_type] = r.rate);
        res.json(rates);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/rates', async (req, res) => {
    const { metal_type, rate } = req.body; // Single update
    try {
        if (metal_type) {
            await pool.query('INSERT INTO daily_rates (metal_type, rate) VALUES ($1, $2) ON CONFLICT (metal_type) DO UPDATE SET rate = $2', [metal_type, rate]);
        } else {
            // Bulk object update support
            for (const [key, val] of Object.entries(req.body)) {
                await pool.query('INSERT INTO daily_rates (metal_type, rate) VALUES ($1, $2) ON CONFLICT (metal_type) DO UPDATE SET rate = $2', [key, val]);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... (Keep get/post product types, master items, business settings logic identical to before) ...

// --- NEW BACKUP & RESTORE ROUTES ---

// 1. GENERATE FULL SYSTEM BACKUP
router.get('/backup', async (req, res) => {
    try {
        const tables = [
            'users', 'business_settings', 'daily_rates', 'product_types', 'master_items',
            'vendors', 'vendor_agents', 'external_shops', 'customers',
            'inventory_items', 'old_metal_items', 'old_metal_purchases',
            'bills', 'bill_items', 'gst_bills', 'gst_bill_items',
            'ledger_entries', 'refinery_batches', 'chits', 'chit_transactions'
        ];

        const backupData = { timestamp: new Date(), version: '1.0', data: {} };

        for (const table of tables) {
            try {
                // Check if table exists to avoid crashes on new schemas
                const check = await pool.query(`SELECT to_regclass('public.${table}')`);
                if (check.rows[0].to_regclass) {
                    const rows = await pool.query(`SELECT * FROM ${table}`);
                    backupData.data[table] = rows.rows;
                }
            } catch (e) {
                console.warn(`Skipping table ${table}: ${e.message}`);
            }
        }

        const fileName = `AURUM_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(backupData, null, 2));

    } catch (err) {
        console.error("Backup Failed:", err);
        res.status(500).json({ error: "Backup generation failed." });
    }
});

// 2. RESTORE SYSTEM BACKUP
// NOTE: This uses 'upload.single' to handle the file upload
router.post('/restore', upload.single('backup_file'), async (req, res) => {
    const client = await pool.connect();
    try {
        if (!req.file) return res.status(400).json({ error: "No backup file uploaded" });

        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        const backup = JSON.parse(fileContent);

        if (!backup.data) throw new Error("Invalid Backup Format");

        await client.query('BEGIN');

        // Order matters for Foreign Key constraints!
        // We delete children first, then parents.
        const cleanupOrder = [
            'chit_transactions', 'chits', 
            'refinery_batches', 
            'ledger_entries', 
            'bill_items', 'bills', 
            'gst_bill_items', 'gst_bills',
            'old_metal_items', 'old_metal_purchases',
            'inventory_items', 
            'vendor_agents', 'vendors', 'external_shops', 'customers',
            'master_items', 'product_types', 'daily_rates',
            'business_settings', 'users' 
        ];

        // 1. Truncate Tables
        for (const table of cleanupOrder) {
            try {
                await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
            } catch (e) { console.log(`Truncate skip ${table}:`, e.message); }
        }

        // 2. Restore Data (Reverse Order - Parents first)
        const restoreOrder = cleanupOrder.reverse();

        for (const table of restoreOrder) {
            const rows = backup.data[table];
            if (rows && rows.length > 0) {
                for (const row of rows) {
                    const keys = Object.keys(row).map(k => `"${k}"`).join(", ");
                    const values = Object.values(row);
                    const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
                    
                    const query = `INSERT INTO ${table} (${keys}) VALUES (${placeholders})`;
                    await client.query(query, values);
                }
            }
        }

        await client.query('COMMIT');
        
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        
        res.json({ success: true, message: "System Restored Successfully" });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Restore Failed:", err);
        if (req.file) fs.unlinkSync(req.file.path); // Clean up
        res.status(500).json({ error: "Restore Failed: " + err.message });
    } finally {
        client.release();
    }
});

module.exports = router;