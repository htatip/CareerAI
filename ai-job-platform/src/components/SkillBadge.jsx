export default function SkillBadge({ skill }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
      {skill}
    </span>
  );
}
