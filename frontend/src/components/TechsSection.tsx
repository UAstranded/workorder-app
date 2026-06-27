import { TechAssignment } from "../types";

interface TechsSectionProps {
  techs: TechAssignment[];
  onChange: (techs: TechAssignment[]) => void;
}

export default function TechsSection({ techs, onChange }: TechsSectionProps) {
  const addTech = () => {
    onChange([...techs, { tech_name: "", sort_order: techs.length }]);
  };

  const removeTech = (index: number) => {
    onChange(techs.filter((_, i) => i !== index));
  };

  const updateTech = (index: number, tech_name: string) => {
    const updated = techs.map((t, i) => (i === index ? { ...t, tech_name } : t));
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Techs Assigned
        </label>
        <button
          type="button"
          onClick={addTech}
          className="text-sm text-brand-600 hover:text-brand-500 dark:text-brand-400 dark:hover:text-brand-300"
        >
          + Add Tech
        </button>
      </div>
      {techs.map((tech, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={tech.tech_name}
            onChange={(e) => updateTech(index, e.target.value)}
            placeholder="Tech name"
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => removeTech(index)}
            className="text-red-500 hover:text-red-400 text-sm font-medium"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
