import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: "TamJams | Small-Batch Real-Fruit Jams",
  description:
    "Small-batch, real-fruit jams. 7 flavors, 3 sizes. Vegan, gluten-free, non-GMO.",
  openGraph: {
    title: "TamJams | Small-Batch Real-Fruit Jams",
    description:
      "Small-batch, real-fruit jams. 7 flavors, 3 sizes. Vegan, gluten-free, non-GMO.",
    siteName: "TamJams",
  },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
