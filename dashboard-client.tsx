// Updated Dashboard Client Code

import React from 'react';
import { Card, Typography } from '@mui/material';
import { Motion } from 'framer-motion';
import { IncomeIcon, ExpenseIcon } from './icons'; // Use your professional icons here

const dashboardMetrics = [
    { title: 'Total Income', value: '$5000', type: 'income' },
    { title: 'Total Expenses', value: '$3000', type: 'expense' },
];

const DashboardClient = () => {
    return (
        <div style={{ padding: '20px', backgroundColor: '#f8f9fa', fontFamily: 'Arial, sans-serif' }}>
            <Typography variant='h4' style={{ marginBottom: '20px', textAlign: 'center' }}>Dashboard</Typography>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {dashboardMetrics.map((metric) => (
                    <Motion.div
                        key={metric.title}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <Card style={{ margin: '10px', padding: '20px', flex: '1 1 calc(33% - 20px)', background: metric.type === 'income' ? 'linear-gradient(to right, #4CAF50, #81C784)' : 'linear-gradient(to right, #F44336, #EF5350)', borderRadius: '12px' }}>
                            <Typography variant='h6' style={{ color: '#fff' }}>{metric.title}</Typography>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {metric.type === 'income' ? <IncomeIcon /> : <ExpenseIcon />}
                                <Typography variant='h5' style={{ color: '#fff' }}>{metric.value}</Typography>
                            </div>
                        </Card>
                    </Motion.div>
                ))}
            </div>
            {/* Additional components for better form styling and other UI enhancements can be added below */}
        </div>
    );
};

export default DashboardClient;