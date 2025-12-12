import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Free",
    price: "Rp 0",
    description: "Good for trying the core features.",
    features: ["Basic AI suggestions", "Limited projects", "Email support"],
  },
  {
    name: "Pro",
    price: "Rp 149.000 / month",
    description: "For students and professionals who write frequently.",
    features: [
      "Unlimited projects",
      "Grounded AI search on your sources",
      "Priority email support",
    ],
    highlight: true,
  },
]

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground sm:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="max-w-2xl space-y-4 text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Simple pricing for serious writing.
          </h1>
          <p className="text-base text-muted-foreground sm:text-lg">
            Start for free, and upgrade when you are ready to use AI and
            subscriptions more intensively.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col justify-between rounded-xl border bg-card p-6 text-left shadow-sm ${
                plan.highlight ? "border-primary/40 ring-1 ring-primary/30" : ""
              }`}
            >
              <div className="space-y-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  {plan.name}
                </h2>
                <p className="text-2xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                >
                  {plan.name === "Free" ? "Start for free" : "Choose Pro"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

