import { FormEvent, useState } from "react";
import { useAuth } from "../lib/auth";
import { useCreateTeam, useInviteMember, useRemoveMember, useTeams } from "../lib/hooks";
import { ApiError, type Team } from "../lib/api";

function TeamCard({ team }: { team: Team }) {
  const { user } = useAuth();
  const invite = useInviteMember(team.id);
  const remove = useRemoveMember(team.id);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const myRole = team.members.find((m) => m.userId === user?.id)?.role;
  const canManage = myRole === "OWNER" || myRole === "ADMIN";

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await invite.mutateAsync(email);
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <h2 className="text-base font-semibold text-white">{team.name}</h2>

      <div className="space-y-1.5">
        {team.members.map((m) => (
          <div key={m.id} className="flex items-center justify-between text-sm">
            <div>
              <span className="text-slate-200">{m.user?.name ?? m.userId}</span>
              <span className="text-slate-500 ml-2">{m.user?.email}</span>
              <span className="ml-2 text-[11px] uppercase tracking-wide text-slate-500">{m.role}</span>
            </div>
            {canManage && m.role !== "OWNER" && (
              <button
                onClick={() => remove.mutate(m.userId)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <form onSubmit={onInvite} className="flex gap-2 pt-2 border-t border-slate-800">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md"
          >
            Invite
          </button>
        </form>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

export function TeamSettings() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const [newTeamName, setNewTeamName] = useState("");

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    await createTeam.mutateAsync(newTeamName.trim());
    setNewTeamName("");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Teams</h1>
          <p className="text-sm text-slate-500">Share hosts with your team. Members must already have an account.</p>
        </div>
      </div>

      <form onSubmit={onCreate} className="flex gap-2">
        <input
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="New team name"
          className="flex-1 rounded-md bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button type="submit" className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md">
          Create team
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-500">Loading teams…</p>}
      {!isLoading && teams?.length === 0 && (
        <p className="text-sm text-slate-500">You're not on any teams yet.</p>
      )}

      <div className="space-y-4">
        {teams?.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
