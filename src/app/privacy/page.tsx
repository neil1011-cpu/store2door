export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl text-foreground">Privacy Policy</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Last updated: March 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">1. Introduction</h2>
                <p className="text-muted-foreground leading-relaxed">FromStore2Door ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by our services.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">2. Information We Collect</h2>
                <p className="text-muted-foreground leading-relaxed">We collect information that you provide directly to us when you create an account, such as your name, email address, phone number, and Tax Registration Number (TRN). We also collect logistical data related to your shipments, including tracking numbers and commercial invoices.</p>
                <p className="text-muted-foreground leading-relaxed italic text-sm">Note: TRNs are collected strictly for customs clearance requirements mandated by the Jamaica Customs Agency.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">3. How We Use Your Information</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>To provide and maintain our global courier services.</li>
                    <li>To facilitate customs clearance procedures in Jamaica.</li>
                    <li>To communicate with you regarding your shipments and account status.</li>
                    <li>To process payments and generate invoices.</li>
                    <li>To comply with regulatory and legal requirements.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">4. Data Security</h2>
                <p className="text-muted-foreground leading-relaxed">We implement industry-standard security measures, including database-level encryption and strict Row Level Security (RLS) via Supabase, to protect your personal data from unauthorized access or disclosure.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">5. Third-party Sharing</h2>
                <p className="text-muted-foreground leading-relaxed">We share your information with third parties only when necessary to perform our services (e.g., sharing TRN and invoice data with Jamaica Customs or our logistics hub partners). We do not sell your personal data to marketers.</p>
            </section>
        </div>
    )
}
