# **App Name**: FluxoPro

## Core Features:

- Automated Transaction Entry: Automatically generate Firestore entries for recurring or installment transactions based on user-defined parameters. Uses 'groupId' to connect related entries.
- Transaction Aggregation: Aggregate multiple sub-transactions into a single primary entry, ideal for summarizing credit card bills. Retains details in the description.
- Integrated Calculator: Include an accessible, simple calculator within value entry forms to assist with transaction inputs.
- Dashboard Visualization: Provide visual representations of financial data including monthly flow, spending by category, and total movements via bar, doughnut, and pie charts.
- Complete Transaction History: A dedicated tab lists all transactions with search and filter functionality. Recurring groups are collapsed for easy viewing, with drill-down options.
- Budgeting Tool: Alert user with email notification or similar if a transaction puts the user over budget
- User ID Persistence: Store userId in localStorage to ensure data accessibility across sessions and code updates.

## Style Guidelines:

- Primary color: Gold (#FFD700) to convey a sense of premium quality and sophistication, complementing the dark mode aesthetic.
- Background color: Very dark gray (#121212) for a high-contrast dark mode interface that is easy on the eyes.
- Accent color: Light gray (#D3D3D3) to provide contrast and highlight key interactive elements without overwhelming the dark theme.
- Body and headline font: 'Inter' (sans-serif) for a clean, modern, and readable text, suitable for both headings and body content.
- Note: currently only Google Fonts are supported.
- Use minimalist, monochrome icons that follow the golden color scheme for key actions and navigation.
- Implement a clean, card-based layout with generous spacing to provide a professional and visually appealing presentation of financial data.
- Subtle transitions and animations to provide feedback and improve the user experience.