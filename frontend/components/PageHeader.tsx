"use client";

import Icon from "@/components/Icon";

export default function PageHeader({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header__icon">
        <Icon name={icon as any} size={20} />
      </div>
      <h1>{title}</h1>
      {children && <div className="page-header__actions">{children}</div>}
    </div>
  );
}
