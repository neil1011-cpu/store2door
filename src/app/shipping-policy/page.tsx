export default function ShippingPolicyPage() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-4xl space-y-8 font-body">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter sm:text-6xl text-foreground">Shipping Policy</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Last updated: March 2024</p>
            
            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">1. Delivery Timelines</h2>
                <p className="text-muted-foreground leading-relaxed">
                    FromStore2Door operates a regular shipping schedule. Air Freight typically takes 24-48 business hours from the moment a package is processed at our Florida warehouse to arrival in Jamaica. Sea Freight timelines vary based on the specific vessel schedule, typically ranging from 7-14 business days.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">2. Warehouse Storage</h2>
                <p className="text-muted-foreground leading-relaxed">
                    We provide up to 30 days of free storage at our Florida warehouse to facilitate package consolidation. After 30 days, a storage fee of $1 USD per day per package will be applied. Packages left longer than 60 days without authorization may be deemed abandoned.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">3. Prohibited Items</h2>
                <p className="text-muted-foreground leading-relaxed">
                    The following items are strictly prohibited for shipment:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                    <li>Explosives, firearms, and ammunition.</li>
                    <li>Hazardous chemicals and flammable liquids.</li>
                    <li>Perishable food items (unless by special arrangement).</li>
                    <li>Narcotics and illegal substances.</li>
                    <li>Live animals.</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-bold uppercase italic tracking-tight border-b pb-2">4. Customs Clearance</h2>
                <p className="text-muted-foreground leading-relaxed">
                    All shipments are subject to inspection and duty assessment by the Jamaica Customs Agency (JCA). FromStore2Door acts as your logistics provider but is not responsible for the specific duty rates applied by customs authorities.
                </p>
            </section>
        </div>
    )
}
