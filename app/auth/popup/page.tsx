"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Cookie, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AuthPopupPage() {
    const [step, setStep] = useState<"waiting" | "logged_in" | "extracting" | "done">("waiting");
    const [fplWindow, setFplWindow] = useState<Window | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const openFPL = () => {
        const win = window.open("https://fantasy.premierleague.com", "FPL_Login", "width=800,height=700");
        setFplWindow(win);
        setStep("waiting");

        if (win) {
            toast.info("Please log in to FPL in the new window");

            // Poll to detect when user is logged in
            intervalRef.current = setInterval(() => {
                try {
                    // Try to access the window - if we can't, it might be on a different origin
                    if (win.closed) {
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                        }
                        setStep("waiting");
                        toast.error("Window closed. Please try again.");
                        return;
                    }

                    // Check if user is on fantasy.premierleague.com and logged in
                    // We can't directly access the DOM due to CORS, but we can inject a script
                    // when user manually clicks "Extract Cookies" button
                } catch (e) {
                    // Expected - cross-origin error
                }
            }, 1000);
        } else {
            toast.error("Popup blocked! Please allow popups for this site.");
        }
    };

    const extractCookies = async () => {
        if (!fplWindow || fplWindow.closed) {
            toast.error("Please open FPL window first");
            return;
        }

        setStep("extracting");

        // We can't directly access cross-origin cookies, but we can ask the user to run a script
        // OR we can use a proxy approach

        // For now, show instructions
        toast.info("Copy the script and run it in the FPL console");

        // The script to extract cookies
        const script = `
(function() {
    const cookies = document.cookie;
    console.log('Cookies extracted:', cookies);
    // Can't use window.opener.postMessage due to CORS
    // User needs to manually copy this
    return cookies;
})();
        `.trim();

        navigator.clipboard.writeText(script);
        toast.success("Script copied! Paste in FPL console and copy the result");
    };

    const handlePasteCookies = (cookies: string) => {
        if (window.opener) {
            window.opener.postMessage(
                {
                    type: "FPL_COOKIES_CAPTURED",
                    cookies: cookies.trim(),
                },
                window.location.origin
            );
            setStep("done");
            setTimeout(() => window.close(), 1000);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg border-primary/20 bg-card/95 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Cookie className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">FPL Login</CardTitle>
                    <CardDescription>
                        Simplified login flow
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {step === "waiting" && (
                        <>
                            <p className="text-sm text-muted-foreground text-center">
                                Click below to open FPL and log in
                            </p>
                            <Button
                                onClick={openFPL}
                                className="w-full bg-gradient-to-r from-primary to-secondary"
                                size="lg"
                            >
                                <ExternalLink className="mr-2 h-5 w-5" />
                                Open FPL & Log In
                            </Button>
                        </>
                    )}

                    {(step === "waiting" && fplWindow) && (
                        <div className="space-y-3 pt-4 border-t">
                            <p className="text-sm font-medium text-center">After logging in to FPL:</p>
                            <div className="bg-primary/5 p-4 rounded-lg space-y-2 text-sm">
                                <p>1. Press <kbd className="px-2 py-1 bg-background rounded">F12</kbd> in FPL window</p>
                                <p>2. Go to <strong>Console</strong> tab</p>
                                <p>3. Type: <code className="bg-background px-2 py-1 rounded">document.cookie</code></p>
                                <p>4. Copy the output</p>
                                <p>5. Paste below</p>
                            </div>

                            <textarea
                                placeholder="Paste cookies here..."
                                className="w-full h-24 p-3 rounded border bg-background text-xs font-mono"
                                onChange={(e) => {
                                    if (e.target.value.trim()) {
                                        handlePasteCookies(e.target.value);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {step === "extracting" && (
                        <div className="text-center space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                            <p className="text-sm">Extracting cookies...</p>
                        </div>
                    )}

                    {step === "done" && (
                        <div className="text-center space-y-3">
                            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
                            <p className="text-lg font-semibold text-green-600">Success!</p>
                            <p className="text-sm text-muted-foreground">Closing popup...</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
