'use client';
export default function LoadingSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-bar skeleton-header" />
      <div className="skeleton-bar skeleton-search" />
      <div className="skeleton-bar skeleton-card" />
      <div className="skeleton-bar skeleton-card" />
      <div className="skeleton-bar skeleton-card" />
    </div>
  );
}
