export function KnowFlowLogo({ className = "" }) {
  return (
    <svg className={["knowflow-logo", className].filter(Boolean).join(" ")} viewBox={"0 0 48 48"} aria-hidden={"true"} focusable={"false"}>
      <rect className={"knowflow-logo-frame"} x={"4"} y={"4"} width={"40"} height={"40"} rx={"12"} />
      <path className={"knowflow-logo-flow"} d={"M14.5 15.5C19.5 10.5 28.4 10.8 33.5 15.9C39.7 22.1 36.8 33 28.2 35.5C22.7 37.1 17 34.9 14.2 30.2"} />
      <path className={"knowflow-logo-k"} d={"M17 14v20"} />
      <path className={"knowflow-logo-k"} d={"M31 14L20.5 24.2L32 34"} />
      <circle className={"knowflow-logo-node"} cx={"14.5"} cy={"15.5"} r={"2.3"} />
      <circle className={"knowflow-logo-node"} cx={"33.5"} cy={"15.9"} r={"2.3"} />
      <circle className={"knowflow-logo-node"} cx={"28.2"} cy={"35.5"} r={"2.3"} />
    </svg>
  );
}
