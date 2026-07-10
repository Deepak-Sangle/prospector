import type { AnchorHTMLAttributes } from "react";
import { PickaxeMark } from "./icons";

/** The Prospector brand logotype, used in both the nav and the footer. */
export function BrandLink({
  href = "#top",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className="brand" href={href} {...props}>
      <span className="brand__mark">
        <PickaxeMark width={26} height={26} />
      </span>
      Prospector
    </a>
  );
}
