"use client";
import { Label } from "@/components/ui/label";
import { HiUsers, HiCheck } from "react-icons/hi";

type Group = { id: string; name: string; _count: { contacts: number } };

interface Step3AudienceProps {
  groups: Group[];
  selectedGroupIds: string[];
  setSelectedGroupIds: (ids: string[]) => void;
  totalRecipients: number;
}

export default function Step3Audience({
  groups,
  selectedGroupIds,
  setSelectedGroupIds,
  totalRecipients,
}: Step3AudienceProps) {
  function toggleGroup(id: string) {
    setSelectedGroupIds(
      selectedGroupIds.includes(id) ? selectedGroupIds.filter((g) => g !== id) : [...selectedGroupIds, id]
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div>
        <Label className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <HiUsers /> Target Audience Groups *
        </Label>

        {groups.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 text-sm">No audience groups available</p>
            <p className="text-gray-400 text-xs mt-1">Create audience groups first to send campaigns</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  selectedGroupIds.includes(group.id)
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedGroupIds.includes(group.id)
                      ? "bg-violet-500 border-violet-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedGroupIds.includes(group.id) && (
                    <HiCheck className="text-white text-sm" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{group.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {group._count?.contacts || 0} contact{(group._count?.contacts || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipient Counter */}
      {selectedGroupIds.length > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Total Recipients</p>
              <p className="text-xs text-gray-600 mt-1">
                {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? "s" : ""} selected
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-violet-600">{totalRecipients}</p>
              <p className="text-xs text-gray-600">contact{totalRecipients !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
      )}

      {selectedGroupIds.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700">
            ℹ️ <strong>Select at least one audience group</strong> to continue
          </p>
        </div>
      )}
    </div>
  );
}
