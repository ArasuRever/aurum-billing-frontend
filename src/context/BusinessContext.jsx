import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../api';

export const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
    const [settings, setSettings] = useState({
        name: 'AURUM BILLING',
        logo: null,
        address: '',
        phone: ''
    });

    const refreshSettings = async () => {
        try {
            const res = await api.getBusinessSettings();
            if (res.data && res.data.business_name) {
                setSettings({
                    name: res.data.business_name,
                    logo: res.data.logo, 
                    address: res.data.address,
                    phone: res.data.contact_number,
                    license: res.data.license_number // Added license in case you need it
                });
            }
        } catch (err) {
            console.error("Failed to load business settings", err);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <BusinessContext.Provider value={{ settings, refreshSettings }}>
            {children}
        </BusinessContext.Provider>
    );
};

// --- THIS WAS MISSING ---
export const useBusiness = () => {
    return useContext(BusinessContext);
};