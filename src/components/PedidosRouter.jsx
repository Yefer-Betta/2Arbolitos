import React, { useState } from 'react';
import { VistaMesas } from './VistaMesas';
import { POS } from './POS';

export function PedidosRouter() {
    const [selectedTableId, setSelectedTableId] = useState(null);

    // If no table is selected, show the table overview
    if (!selectedTableId) {
        return <VistaMesas onSelectTable={setSelectedTableId} />;
    }

    // If a table is selected, show the POS for that table
    return (
        <POS 
            tableId={selectedTableId} 
            onBack={() => setSelectedTableId(null)} 
        />
    );
}