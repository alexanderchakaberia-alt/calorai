declare module "@/components/GoalsCalculator" {
  interface GoalsCalculatorProps {
    onSuccess?: () => void;
    defaultTab?: "manual" | "calc";
  }
  export default function GoalsCalculator(props: GoalsCalculatorProps): JSX.Element;
}
