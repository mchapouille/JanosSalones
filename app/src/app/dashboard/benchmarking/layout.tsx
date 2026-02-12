import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Benchmarking",
};

export default function BenchmarkingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
