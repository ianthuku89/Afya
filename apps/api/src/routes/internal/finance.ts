import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticateInternal, authorizeInternal } from '../../middleware/internalAuth';

export const internalFinanceRouter = Router();

internalFinanceRouter.use(authenticateInternal);

// GET all revenue ledger entries (The 1.75% cut off claims)
internalFinanceRouter.get('/ledger', authorizeInternal(['SUPER_ADMIN', 'DIRECTOR', 'FINANCE']), async (req, res, next) => {
    try {
        const ledger = await prisma.revenueLedger.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                claim: { select: { claimNumber: true, facility: { select: { name: true } } } }
            }
        });
        res.json({ success: true, data: ledger });
    } catch (err) { next(err); }
});

// POST generate monthly invoice to SHA
internalFinanceRouter.post('/invoices/generate', authorizeInternal(['SUPER_ADMIN', 'FINANCE']), async (req, res, next) => {
    try {
        // Find all UNBILLED ledger items
        const unbilledItems = await prisma.revenueLedger.findMany({
            where: { status: 'UNBILLED' }
        });

        if (unbilledItems.length === 0) {
            return res.status(400).json({ error: 'No unbilled revenue to invoice.' });
        }

        const totalClaimAmount = unbilledItems.reduce((sum, item) => sum + Number(item.claimAmountKES), 0);
        const totalFeeKES = unbilledItems.reduce((sum, item) => sum + Number(item.seaboardFeeKES), 0);

        const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const invoiceNumber = `INV-SHA-${Date.now().toString().slice(-6)}`;

        // Transaction to create invoice and update ledger items
        const invoice = await prisma.$transaction(async (tx) => {
            const newInvoice = await tx.invoice.create({
                data: {
                    invoiceNumber,
                    billingPeriod: currentMonth,
                    totalClaims: unbilledItems.length,
                    totalClaimAmount,
                    totalFeeKES,
                    status: 'DRAFT'
                }
            });

            await tx.revenueLedger.updateMany({
                where: { id: { in: unbilledItems.map(i => i.id) } },
                data: { invoiceId: newInvoice.id, status: 'BILLED' }
            });

            return newInvoice;
        });

        res.status(201).json({ success: true, data: invoice });
    } catch (err) { next(err); }
});

// GET all invoices
internalFinanceRouter.get('/invoices', authorizeInternal(['SUPER_ADMIN', 'DIRECTOR', 'FINANCE']), async (req, res, next) => {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: invoices });
    } catch (err) { next(err); }
});

// POST mock sync to QuickBooks Online
internalFinanceRouter.post('/invoices/:id/sync-quickbooks', authorizeInternal(['SUPER_ADMIN', 'FINANCE']), async (req, res, next) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({ where: { id } });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
        if (invoice.erpSyncStatus === 'SYNCED') return res.status(400).json({ error: 'Invoice already synced' });

        // MOCK: QuickBooks Online API Request Payload Simulation
        const qboPayload = {
            Line: [
                {
                    Amount: Number(invoice.totalFeeKES),
                    DetailType: "SalesItemLineDetail",
                    SalesItemLineDetail: {
                        ItemRef: { value: "1", name: "AfyaToken Claim Processing Fee (1.75%)" },
                        Qty: invoice.totalClaims,
                        UnitPrice: Number(invoice.totalFeeKES) / invoice.totalClaims
                    }
                }
            ],
            CustomerRef: { value: "SHA-001" },
            DocNumber: invoice.invoiceNumber
        };

        // Simulate network delay to QuickBooks API
        await new Promise(resolve => setTimeout(resolve, 1500));

        // MOCK: Response from QuickBooks
        const qboReferenceId = `QBO-${Math.floor(Math.random() * 100000)}`;

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                erpSyncStatus: 'SYNCED',
                erpReferenceId: qboReferenceId,
                erpSyncedAt: new Date(),
                status: 'SENT_TO_SHA' // Automatically update internal status
            }
        });

        res.json({ success: true, data: updatedInvoice, simulatedQboPayload: qboPayload });
    } catch (err) { next(err); }
});
