import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { revalidatePath } from 'next/cache';

const execAsync = promisify(exec);

const IS_VERCEL = process.env.VERCEL === '1';
const GITHUB_REPO = process.env.GITHUB_REPO || 'mchapouille/JanosSalones';
const GITHUB_PAT = process.env.GITHUB_PAT;

export async function POST() {
    // ─────────────────────────────────────────────────────────────────
    // PRODUCTION (Vercel): trigger GitHub Actions workflow via API
    // The workflow downloads the Excel from Google Drive, runs
    // data_processor.py, commits the updated JSON, and Vercel redeploys.
    // ─────────────────────────────────────────────────────────────────
    if (IS_VERCEL) {
        if (!GITHUB_PAT) {
            return NextResponse.json(
                { success: false, message: 'GITHUB_PAT no configurado en Vercel.' },
                { status: 500 }
            );
        }

        // ── Step 1: validate token identity ──
        try {
            const userRes = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${GITHUB_PAT}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                },
            });
            if (!userRes.ok) {
                const body = await userRes.text();
                return NextResponse.json(
                    { success: false, message: `Token inválido (${userRes.status})`, error: body },
                    { status: 500 }
                );
            }
            const userJson = await userRes.json();
            console.log('[refresh] Token valid for user:', userJson.login);
        } catch (e: any) {
            return NextResponse.json(
                { success: false, message: 'No se pudo validar el token', error: e.message },
                { status: 500 }
            );
        }

        // ── Step 2: dispatch workflow ──
        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/refresh-data.yml/dispatches`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${GITHUB_PAT}`,
                        Accept: 'application/vnd.github+json',
                        'X-GitHub-Api-Version': '2022-11-28',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ref: 'main',
                        inputs: { triggered_by: 'dashboard-button' },
                    }),
                }
            );

            if (!response.ok) {
                const body = await response.text();
                console.error('GitHub dispatch error:', response.status, body);
                return NextResponse.json(
                    { success: false, message: `Error al disparar el workflow: ${response.status}`, error: body },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                async: true,
                message: 'Workflow iniciado. Los datos se actualizarán en ~2 minutos.',
            });

        } catch (error: any) {
            console.error('Error calling GitHub API:', error);
            return NextResponse.json(
                { success: false, message: 'Error de red al conectar con GitHub', error: error.message },
                { status: 500 }
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // LOCAL: run Python script directly (original behavior)
    // ─────────────────────────────────────────────────────────────────
    try {
        console.log('Initiating local data refresh…');

        const { stdout, stderr } = await execAsync('python3 scripts/data_processor.py');

        console.log('Python output:', stdout);
        if (stderr) console.error('Python stderr:', stderr);

        revalidatePath('/');
        revalidatePath('/dashboard');
        revalidatePath('/dashboard/performance');
        revalidatePath('/dashboard/benchmarking');
        revalidatePath('/dashboard/efficiency');
        revalidatePath('/dashboard/contracts');

        return NextResponse.json({
            success: true,
            async: false,
            message: 'Datos refrescados correctamente',
            output: stdout,
        });

    } catch (error: any) {
        console.error('Error refreshing data:', error);
        return NextResponse.json(
            { success: false, message: 'Error al procesar el archivo Excel', error: error.message },
            { status: 500 }
        );
    }
}
