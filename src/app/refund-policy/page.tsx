export default function RefundPolicyPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl text-foreground">Refund Policy</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Last updated: March 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">1. Service Fee Refunds</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Shipping and service fees are generally non-refundable once a package has been processed for transport. Refunds may be considered in the following cases:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>A package was lost due to a direct error by FromStore2Door staff.</li>
                    <li>An overcharge occurred due to a weighing or billing error.</li>
                    <li>The service was not rendered within a reasonable timeframe due to gross negligence.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">2. Customs Duties & Taxes</h2>
                <p className="text-muted-foreground leading-relaxed">
                    FromStore2Door cannot refund any customs duties or taxes paid to the Jamaica Customs Agency. If you believe your duty assessment was incorrect, you must file a formal appeal directly with the Jamaica Customs Agency.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">3. Damaged Items</h2>
                <p className="text-muted-foreground leading-relaxed">
                    If an item arrives damaged, we will assist you in filing a claim if insurance was purchased. Claims must be submitted within 48 hours of package pickup or delivery, accompanied by photos of the outer packaging and the damaged contents.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">4. Processing Time</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Authorized refunds will be processed within 5-10 business days and will be credited to your original payment method or your FromStore2Door account balance.
                </p>
            </section>
        </div>
    )
}
