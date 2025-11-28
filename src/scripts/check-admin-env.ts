import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env');

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    console.log('--- .env content (filtered) ---');

    const lines = envFile.split('\n');
    let adminEmailsFound = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('ADMIN_EMAILS=')) {
            console.log(trimmed);
            adminEmailsFound = true;
        }
    }

    if (!adminEmailsFound) {
        console.log('ADMIN_EMAILS is NOT set in .env');
    } else {
        console.log('ADMIN_EMAILS is present in .env');
    }

} catch (error) {
    console.error('Error reading .env file:', error);
}
