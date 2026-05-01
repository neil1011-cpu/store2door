export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-bold font-headline">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: October 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold font-headline">1. Introduction</h2>
                <p>FromStore2Door ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by our services.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold font-headline">2. Information We Collect</h2>
                <p>We collect information that you provide directly to us when you create an account, such as your name, email address, phone number, and Tax Registration Number (TRN). We also collect logistical data related to your shipments, including tracking numbers and commercial invoices.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold font-headline">3. How We Use Your Information</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>To provide and maintain our global courier services.</li>
                    <li>To facilitate customs clearance procedures in Jamaica.</li>
                    <li>To communicate with you regarding your shipments and account status.</li>
                    <li>To process payments and generate invoices.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold font-headline">4. Data Security</h2>
                <p>We implement industry-standard security measures, including encryption and strict access controls via Google Cloud and Firebase, to protect your personal data from unauthorized access or disclosure.</p>
            </section>
        </div>
    )
}