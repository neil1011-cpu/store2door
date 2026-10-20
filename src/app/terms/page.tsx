export default function TermsPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl text-foreground">Terms of Service</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Last updated: March 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">By using the FromStore2Door website and services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">2. Description of Service</h2>
                <p className="text-muted-foreground leading-relaxed">FromStore2Door provides international courier and logistical services, shipping items from worldwide locations (primarily Florida, USA) to various locations in Jamaica. Services include warehouse storage, air/sea freight, and customs brokerage.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">3. Customer Responsibilities</h2>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Providing accurate commercial invoices for every shipment.</li>
                    <li>Ensuring full name and mailbox number are included on all incoming packages.</li>
                    <li>Paying all applicable shipping fees, customs duties, and taxes in a timely manner.</li>
                    <li>Notifying us of incoming packages through the "Pre-Alert" interface.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">4. Customs and Duties</h2>
                <p className="text-muted-foreground leading-relaxed">Customers are solely responsible for providing accurate commercial invoices for customs valuation. All applicable Jamaican customs duties, taxes, and fees are the responsibility of the customer and must be paid before final delivery or pickup.</p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">5. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">FromStore2Door is not liable for delays caused by third-party carriers, customs inspections, or acts of nature. Liability for lost or damaged packages is limited to the declared value of the item, provided sufficient insurance was purchased and proof of value provided.</p>
            </section>
        </div>
    )
}
