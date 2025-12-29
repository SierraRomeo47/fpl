import { redirect } from "next/navigation";
import { createSession } from "@/lib/session-store";
import { FPLClient } from "@/lib/fpl-client";

export default async function AuthCallbackPage({
    searchParams,
}: {
    searchParams: { cookies?: string };
}) {
    const cookies = searchParams.cookies;

    if (!cookies) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Invalid Callback</h1>
                    <p className="text-muted-foreground">No cookies provided</p>
                </div>
            </div>
        );
    }

    try {
        // Validate cookies with FPL API
        const client = new FPLClient({ cookies });
        const me = await client.getMe();

        if (!me || !me.player?.entry) {
            throw new Error("Invalid cookies");
        }

        // Create session
        const sessionId = crypto.randomUUID();
        await createSession(sessionId, cookies, me.player.entry);

        // Set cookie and redirect
        const headers = new Headers();
        headers.append(
            "Set-Cookie",
            `fpl_session_id=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
        );

        // Client-side redirect with success message
        return (
            <html>
                <head>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.opener?.postMessage({ type: 'LOGIN_SUCCESS' }, window.location.origin);
                                setTimeout(() => {
                                    window.close();
                                    if (!window.closed) {
                                        window.location.href = '/dashboard';
                                    }
                                }, 500);
                            `,
                        }}
                    />
                </head>
                <body className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-500/20 to-green-600/20">
                    <div className="text-center space-y-4 p-8">
                        <div className="text-6xl">✓</div>
                        <h1 className="text-2xl font-bold text-green-600">Login Successful!</h1>
                        <p className="text-muted-foreground">Redirecting to dashboard...</p>
                    </div>
                </body>
            </html>
        );
    } catch (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-destructive">Login Failed</h1>
                    <p className="text-muted-foreground">
                        {error instanceof Error ? error.message : "Invalid cookies"}
                    </p>
                    <a href="/login" className="text-primary hover:underline">
                        Back to Login
                    </a>
                </div>
            </div>
        );
    }
}
