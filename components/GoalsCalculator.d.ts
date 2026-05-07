declare module "@/components/GoalsCalculator" {
  export const CALORAI_GOALS_LS_KEY: string;
  interface GoalsCalculatorProps {
    onSuccess?: () => void;
    defaultTab?: "manual" | "calc";
    isModal?: boolean;
    onDismiss?: () => void;
  }
  export default function GoalsCalculator(props: GoalsCalculatorProps): JSX.Element;
}
