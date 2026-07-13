import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"

import localFont from "next/font/local"

const sfPro = localFont({
  src: [
    {
      path: "../../public/fonts/sf-pro-display_regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/sf-pro-display_medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/sf-pro-display_semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/sf-pro-display_bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sf",
  display: "swap",
})

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
    <html lang="en" data-mode="light" className={sfPro.variable}>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
