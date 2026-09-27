// Páginas imprimíveis: sem menu lateral. A autenticação é feita na própria página (getCaseForUser).
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-screen bg-bone-200 print:bg-white">{children}</div>;
}
