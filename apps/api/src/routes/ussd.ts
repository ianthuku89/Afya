import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const ussdRouter = Router();

// USSD Entry Point - handles Safaricom USSD callbacks
ussdRouter.post('/ussd', async (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    const msisdn = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber.replace(/^254/, '254')}`;
    
    // Split input text into array
    const textArray = text.split('*').filter(Boolean);
    const level = textArray.length;

    // Main menu response
    const mainMenuResponse = `CON Welcome to HealthToken Kenya\n1. My Wallet\n2. Auto-Deduct Settings\n3. Transaction History\n4. Help & Support`;

    // Initial request - main menu
    if (text === '') {
        const user = await prisma.user.findFirst({
            where: { phoneNumber: msisdn },
            include: { wallet: true }
        });

        if (!user) {
            return res.send(`END Please register with HealthToken first. Dial *XXX*XXXX# to sign up.`);
        }

        return res.send(mainMenuResponse);
    }

    // Get user for processing menu selections
    const user = await prisma.user.findFirst({
        where: { phoneNumber: msisdn },
        include: { wallet: true }
    });

    if (!user) {
        return res.send(`END User not found. Please register first.`);
    }

    let response = '';

    // Main Menu Options
    if (textArray[0] === '1') {
        // My Wallet
        const balance = user.wallet?.balanceAfya || 0;
        const autoDeduct = user.wallet?.autoDeductOptIn ? 'Enabled' : 'Disabled';
        response = `END Your HealthToken Wallet Balance: KES ${Number(balance)}\nAuto-Deduct: ${autoDeduct}\nDaily SHIF Contributions: Processed with your first qualifying merchant payment.`;
    } 
    else if (textArray[0] === '2') {
        // Auto-Deduct Settings - SINGLE PROMPT FLOW (your updated logic)
        const optInStatus = user.wallet?.autoDeductOptIn ? 'ENABLED' : 'DISABLED';
        
        if (level === 1) {
            // Single confirmation prompt instead of multi-step
            if (optInStatus) {
                // Already opted in - show status and options
                response = `CON M-PESA Auto-Deduct is ${optInStatus}.\nYour daily KES 30 SHIF contribution is active.\n1. View Daily Ceiling\n2. Return to Main Menu`;
            } else {
                // Single opt-in confirmation prompt
                response = `CON Enable Auto-Deduct? By pressing 1, you confirm you want to opt in to M-PESA Auto-Deductions. A fixed KES 30 daily SHIF contribution will be added to your first qualifying merchant payment over KES 100.\n1. Confirm & Enable Auto-Deduct\n2. Cancel`;
            }
        } else if (level === 2 && !user.wallet?.autoDeductOptIn && textArray[1] === '1') {
            // Single step confirmation - process opt-in immediately
            await prisma.wallet.update({
                where: { userId: user.id },
                data: { autoDeductOptIn: true }
            });
            // Log Consent
            await prisma.consentRecord.create({
                data: {
                    userId: user.id,
                    consentType: 'loyalty_auto_contribute',
                    granted: true,
                    ipAddress: 'USSD_GATEWAY'
                }
            });
            response = `END You have successfully opted into M-PESA Auto-Deductions. Your daily KES 30 SHIF contributions will now be added to your qualifying merchant payments.`;
        } else if (level === 2 && textArray[1] === '1' && user.wallet?.autoDeductOptIn) {
            // View daily ceiling
            response = `END Your M-PESA Auto-Deduct daily ceiling is set to KES 30. This is the fixed daily SHIF contribution amount and cannot be modified.`;
        } else if (level === 2 && (textArray[1] === '2' || textArray[1] === 'cancel')) {
            // Cancel - return to main menu
            response = `END Auto-Deduct setup cancelled. Returning to main menu.`;
        } else {
            response = `END Invalid Choice. Please try again.`;
        }
    }
    else if (textArray[0] === '3') {
        // Transaction History
        const transactions = await prisma.autoDeductionLog.findMany({
            where: { userId: user.id },
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        if (transactions.length === 0) {
            response = `END You have no auto-deduction transactions. Enable auto-deduct to start contributing to SHIF.`;
        } else {
            let txString = `Your last 5 SHIF contributions:\n`;
            transactions.forEach((tx, i) => {
                txString += `${i+1}. KES ${Number(tx.deductedAmount)} - ${tx.createdAt.toLocaleDateString()}\n`;
            });
            txString += `Total contributed: KES ${transactions.reduce((sum, tx) => sum + Number(tx.deductedAmount), 0)}`;
            response = `END ${txString}`;
        }
    }
    else if (textArray[0] === '4') {
        // Help & Support
        response = `END HealthToken Support:\nCall: 0700 123 456\nEmail: support@healthtoken.co.ke\nWebsite: www.healthtoken.co.ke\nSMS: HELP to 22233`;
    }
    else {
        // Invalid main menu selection
        response = mainMenuResponse;
    }

    return res.send(response);
});