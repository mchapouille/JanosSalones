import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Eficiencia",
};

export default function EfficiencyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
