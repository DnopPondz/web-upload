import "../styles/index.css";
import type { AppProps } from "next/app";
import { Sour_Gummy, Itim } from "next/font/google";

const sourGummy = Sour_Gummy({
  subsets: ["latin"],
  weight: "400",
});

const itim = Itim({
  subsets: ["latin", "thai"],
  weight: "400",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${sourGummy.className} ${itim.variable}`}>
      <Component {...pageProps} />
    </main>
  );
}

