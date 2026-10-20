export default function CookiesPolicyPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl text-foreground">Cookies Policy</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Last updated: March 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">1. What are Cookies?</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">2. How We Use Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                    At FromStore2Door, we use cookies to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Maintain your secure session and identify you when you are logged in.</li>
                    <li>Remember your preferences and settings, such as currency or shipping preferences.</li>
                    <li>Analyze how you interact with our website to improve our services and user experience.</li>
                    <li>Protect your account and our services from fraudulent activity.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">3. Types of Cookies We Use</h2>
                <div className="grid gap-6">
                    <div className="p-6 bg-muted/30 rounded-2xl border-2">
                        <h3 className="font-black uppercase italic text-sm mb-2">Essential Cookies</h3>
                        <p className="text-xs text-muted-foreground">These are required for the website to function. They include cookies that allow you to log in to secure areas of our website.</p>
                    </div>
                    <div className="p-6 bg-muted/30 rounded-2xl border-2">
                        <h3 className="font-black uppercase italic text-sm mb-2">Functional Cookies</h3>
                        <p className="text-xs text-muted-foreground">These are used to recognize you when you return to our website. This enables us to personalize our content for you and remember your preferences.</p>
                    </div>
                    <div className="p-6 bg-muted/30 rounded-2xl border-2">
                        <h3 className="font-black uppercase italic text-sm mb-2">Analytical Cookies</h3>
                        <p className="text-xs text-muted-foreground">They allow us to recognize and count the number of visitors and to see how visitors move around our website when they are using it.</p>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">4. Managing Cookies</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" className="text-primary underline">www.aboutcookies.org</a>.
                </p>
            </section>
        </div>
    )
}
