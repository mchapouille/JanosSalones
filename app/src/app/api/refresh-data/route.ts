import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { revalidatePath } from 'next/cache';

const execAsync = promisify(exec);

export async function POST() {
    try {
        console.log('Initiating data refresh...');

        // Use pipenv/poetry/venv if needed, assuming global python or environment python
        // Since Next.js starts the server at the root of `app`, the script is in `scripts/data_processor.py`
        const { stdout, stderr } = await execAsync('python scripts/data_processor.py');

        console.log('Python Output:', stdout);
        if (stderr) {
            console.error('Python Stderr:', stderr);
            // Optionally, we might not fail completely if it's just warnings
        }

        // Revalidate the dashboard paths to force Next.js to fetch new JSON data
        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/performance');

        return NextResponse.json({
            success: true,
            message: 'Datos refrescados correctamente',
            output: stdout
        });

    } catch (error: any) {
        console.error('Error refreshing data:', error);
        return NextResponse.json(
            { success: false, message: 'Error al procesar el archivo Excel', error: error.message },
            { status: 500 }
        );
    }
}
