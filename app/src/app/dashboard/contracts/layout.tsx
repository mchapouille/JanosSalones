import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contratos",
};

export default function ContractsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
