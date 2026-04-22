"use client";

import { motion } from "framer-motion";
import {
	ArrowUpRight,
	AtSign,
	Clock,
	Globe,
	Hash,
	Instagram,
	Loader2,
	MapPin,
	MessageSquareQuote,
	Music2,
	Palette,
	Phone,
	Quote,
	Twitter,
	Youtube,
	type LucideIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
	Profile,
	ProfileResponse,
	UpdateProfileRequest,
} from "@content-assist/shared";
import { AuthInput } from "@/components/ui/AuthInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionCard } from "@/components/ui/SectionCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { ImageUploader } from "@/components/profile/ImageUploader";
import { MediaLibrary } from "@/components/profile/MediaLibrary";
import { OnboardingChecklist } from "@/components/profile/OnboardingChecklist";
import {
	BgmMoodSelector,
	NicheSelector,
	ToneSelector,
} from "@/components/profile/selectors";
import { PROFILE_KEY, useProfile, useUpdateProfile } from "@/modules/profile/hooks";
import { useAuthStore } from "@/stores/auth-store";

const SECTIONS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: "section-about", label: "About" },
	{ id: "section-socials", label: "Socials" },
	{ id: "section-defaults", label: "Creator defaults" },
	{ id: "section-audio", label: "Audio library" },
	{ id: "section-images", label: "Image library" },
];

export default function ProfilePage() {
	const { data, isLoading } = useProfile();
	const profile = data?.profile;
	const user = useAuthStore((s) => s.user);

	if (isLoading || !profile) {
		return <ProfileSkeleton />;
	}

	return <ProfilePageInner profile={profile} displayName={user?.name ?? "You"} />;
}

function ProfilePageInner({
	profile,
	displayName,
}: {
	profile: Profile;
	displayName: string;
}) {
	const update = useUpdateProfile();
	const toast = useToast();
	const [dismissedChecklist, setDismissedChecklist] = useState(false);
	const showOnboarding =
		!profile.onboardingCompleted && !dismissedChecklist;
	const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

	// Scroll-spy against the default viewport. No sticky hero to compensate
	// for now — the hero scrolls away naturally so a small top margin is all
	// that's needed to keep "active" tracking the section that's actually
	// in the reading zone.
	useEffect(() => {
		const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(
			(el): el is HTMLElement => !!el,
		);
		if (els.length === 0) return;
		const obs = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				if (visible[0]) setActiveSection(visible[0].target.id);
			},
			{
				rootMargin: "-20% 0px -60% 0px",
				threshold: [0, 0.25, 0.5, 0.75, 1],
			},
		);
		els.forEach((e) => obs.observe(e));
		return () => obs.disconnect();
	}, []);

	function jump(sectionId: string) {
		const el = document.getElementById(sectionId);
		if (!el) return;
		const y = el.getBoundingClientRect().top + window.scrollY - 16;
		window.scrollTo({ top: y, behavior: "smooth" });
	}

	async function markOnboardingComplete() {
		if (profile.onboardingCompleted) return;
		try {
			await update.mutateAsync({ onboardingCompleted: true });
		} catch {
			// silent — user can complete later
		}
	}

	return (
		<div className="mx-auto w-full max-w-6xl pb-20">
			{/* Hero scrolls with the page now — only the subnav sticks. */}
			<div className="px-6 pt-6 sm:px-10 lg:px-14">
				<Hero profile={profile} displayName={displayName} />
			</div>

			<div className="grid gap-8 px-6 pt-6 sm:px-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-14">
				<aside className="hidden lg:block">
					<nav
						className="flex flex-col gap-1"
						style={{ position: "sticky", top: 16 }}
					>
						{SECTIONS.map((s) => {
							const active = s.id === activeSection;
							return (
								<button
									key={s.id}
									type="button"
									onClick={() => jump(s.id)}
									className={[
										"group relative flex items-center rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
										active
											? "text-text-primary"
											: "text-text-secondary hover:text-text-primary",
									].join(" ")}
								>
									{active ? (
										<motion.span
											layoutId="profile-scroll-pill"
											className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-accent"
											transition={{
												type: "spring",
												stiffness: 500,
												damping: 30,
											}}
										/>
									) : null}
									<span className="font-medium">{s.label}</span>
								</button>
							);
						})}
					</nav>
				</aside>

				<div className="flex flex-col gap-6">
					{showOnboarding ? (
						<OnboardingChecklist
							profile={profile}
							onNavigate={jump}
							onDismiss={() => {
								setDismissedChecklist(true);
								void markOnboardingComplete();
							}}
						/>
					) : null}

					<SectionCard
						id="section-about"
						label="About"
						title="Who you are"
						description="The essentials. Shown across your creator profile."
						view={<AboutView profile={profile} />}
						edit={({ close }) => (
							<AboutEdit
								profile={profile}
								onCancel={close}
								onSave={async (patch) => {
									try {
										await update.mutateAsync(patch);
										toast.success("About updated");
										close();
									} catch (err) {
										toast.error(
											"Couldn't save",
											err instanceof Error ? err.message : undefined,
										);
									}
								}}
								busy={update.isPending}
							/>
						)}
					/>

					<SectionCard
						id="section-socials"
						label="Socials"
						title="Where they can find you"
						view={<SocialsView profile={profile} />}
						edit={({ close }) => (
							<SocialsEdit
								profile={profile}
								onCancel={close}
								onSave={async (patch) => {
									try {
										await update.mutateAsync(patch);
										toast.success("Socials updated");
										close();
									} catch (err) {
										toast.error(
											"Couldn't save",
											err instanceof Error ? err.message : undefined,
										);
									}
								}}
								busy={update.isPending}
							/>
						)}
					/>

					<SectionCard
						id="section-defaults"
						label="Creator defaults"
						title="Your AI starting point"
						description="Feeds into every generation so results match your voice on the first try."
						view={<DefaultsView profile={profile} />}
						edit={({ close }) => (
							<DefaultsEdit
								profile={profile}
								onCancel={close}
								onSave={async (patch) => {
									try {
										await update.mutateAsync(patch);
										toast.success("Defaults updated");
										close();
									} catch (err) {
										toast.error(
											"Couldn't save",
											err instanceof Error ? err.message : undefined,
										);
									}
								}}
								busy={update.isPending}
							/>
						)}
					/>

					<SectionCard
						id="section-audio"
						label="Audio library"
						title="Your tracks"
						description="Music you've uploaded — usable as BGM in the video composer."
						view={<MediaLibrary kind="audio" />}
						edit={() => <MediaLibrary kind="audio" />}
						readOnly
					/>

					<SectionCard
						id="section-images"
						label="Image library"
						title="Your visuals"
						description="Brand imagery, b-roll, product shots — pickable from scene builders."
						view={<MediaLibrary kind="image" />}
						edit={() => <MediaLibrary kind="image" />}
						readOnly
					/>
				</div>
			</div>
		</div>
	);
}

/* ---------------- Hero ---------------- */

function Hero({
	profile,
	displayName,
}: {
	profile: Profile;
	displayName: string;
}) {
	const bootstrap = useAuthStore((s) => s.bootstrap);
	const qc = useQueryClient();

	/**
	 * Optimistic cache write after upload — the returned presigned GET URL is
	 * written into the `["profile"]` query cache, so the hero re-renders
	 * instantly without a network round-trip. bootstrap() separately refreshes
	 * /auth/me so the sidebar UserPill picks up the same image.
	 */
	function applyImage(field: "avatarUrl" | "coverUrl") {
		return (url: string) => {
			qc.setQueryData<ProfileResponse>(PROFILE_KEY, (prev) =>
				prev ? { profile: { ...prev.profile, [field]: url } } : prev,
			);
			if (field === "avatarUrl") void bootstrap();
		};
	}

	const location =
		[profile.locationCity, profile.locationCountry].filter(Boolean).join(", ") || null;
	const hasMeta = Boolean(profile.username || location || profile.website);

	return (
		<div className="relative flex flex-col">
			<div className="relative h-[180px] w-full overflow-hidden rounded-3xl border border-border sm:h-[200px]">
				<ImageUploader
					kind="cover"
					shape="banner"
					url={profile.coverUrl}
					onUploaded={applyImage("coverUrl")}
				/>
			</div>

			{/* Avatar + name — only the avatar overlaps the cover. The meta and
			    bio sit below in their own strip so they don't fight with the
			    cover photo's colours. */}
			<div className="relative -mt-14 flex flex-wrap items-end gap-4 px-2 sm:-mt-16 sm:gap-6 sm:px-6">
				<ImageUploader
					kind="avatar"
					shape="circle"
					size={120}
					url={profile.avatarUrl}
					fallback={displayName}
					onUploaded={applyImage("avatarUrl")}
					className="ring-4 ring-bg"
				/>
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pb-2">
					<h1 className="text-balance text-[26px] font-bold leading-tight tracking-tight text-text-primary sm:text-[30px]">
						{displayName}
					</h1>
					{profile.niche ? (
						<span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-accent">
							{profile.niche}
						</span>
					) : null}
				</div>
			</div>

			{/* Meta strip — readable, off the cover. */}
			{hasMeta ? (
				<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2 text-[13px] text-text-muted sm:px-6">
					{profile.username ? (
						<span className="font-medium text-text-secondary">
							@{profile.username}
						</span>
					) : null}
					{location ? (
						<span className="inline-flex items-center gap-1.5">
							<MapPin className="h-3.5 w-3.5" strokeWidth={2} />
							{location}
						</span>
					) : null}
					{profile.website ? (
						<a
							href={profile.website}
							target="_blank"
							rel="noreferrer"
							className="group inline-flex items-center gap-1.5 text-accent transition-opacity hover:opacity-90"
						>
							<Globe className="h-3.5 w-3.5" strokeWidth={2} />
							<span className="font-medium">Website</span>
							<ArrowUpRight
								className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
								strokeWidth={2.25}
							/>
						</a>
					) : null}
				</div>
			) : null}

			{/* Bio — pinned left accent bar, sits cleanly below the meta. */}
			{profile.bio ? (
				<p className="mt-4 max-w-2xl border-l-2 border-accent/70 px-2 pl-5 text-[14px] leading-relaxed text-text-secondary sm:px-6 sm:pl-9">
					{profile.bio}
				</p>
			) : null}
		</div>
	);
}

/* ---------------- About ---------------- */

const NICHE_EMOJI: Record<string, string> = {
	beauty: "💄",
	finance: "💼",
	fitness: "🏋️",
	food: "🍜",
	travel: "✈️",
	tech: "💻",
	edu: "📚",
	lifestyle: "🌱",
	business: "📈",
	comedy: "🎭",
	other: "✨",
};

function AboutView({ profile }: { profile: Profile }) {
	const location =
		[profile.locationCity, profile.locationCountry].filter(Boolean).join(", ") || null;

	return (
		<div className="flex flex-col gap-5">
			{profile.bio ? (
				<div className="relative rounded-xl border border-border/70 bg-surface-alt/40 px-5 py-4">
					<Quote
						className="absolute -left-1 -top-2 h-4 w-4 rotate-180 text-accent/70"
						strokeWidth={2.25}
						fill="currentColor"
					/>
					<p className="text-[14px] italic leading-relaxed text-text-secondary">
						{profile.bio}
					</p>
				</div>
			) : null}

			<div className="grid gap-3 sm:grid-cols-2">
				<InfoTile
					icon={AtSign}
					label="Username"
					value={profile.username ? `@${profile.username}` : null}
				/>
				<InfoTile
					icon={Hash}
					label="Niche"
					value={profile.niche}
					valuePrefix={profile.niche ? NICHE_EMOJI[profile.niche] : undefined}
				/>
				<InfoTile
					icon={Phone}
					label="Phone"
					value={profile.phone}
					valueClassName="tabular-nums"
				/>
				<InfoTile icon={MapPin} label="Location" value={location} />
				<InfoTile icon={Clock} label="Timezone" value={profile.timezone} />
				<InfoTile
					icon={Globe}
					label="Website"
					value={profile.website}
					href={profile.website ?? undefined}
				/>
			</div>
		</div>
	);
}

function InfoTile({
	icon: Icon,
	label,
	value,
	valuePrefix,
	valueClassName,
	href,
}: {
	icon: LucideIcon;
	label: string;
	value: string | null;
	valuePrefix?: string;
	valueClassName?: string;
	href?: string;
}) {
	const body = (
		<>
			<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-pressed text-text-muted transition-colors group-hover/tile:bg-accent-soft group-hover/tile:text-accent">
				<Icon className="h-4 w-4" strokeWidth={2} />
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
				<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
					{label}
				</span>
				{value ? (
					<span
						className={[
							"truncate text-[14px] font-medium text-text-primary",
							valueClassName ?? "",
						].join(" ")}
					>
						{valuePrefix ? `${valuePrefix} ${value}` : value}
					</span>
				) : (
					<span className="text-[13px] italic text-text-muted">Not set</span>
				)}
			</div>
			{href ? (
				<ArrowUpRight
					className="h-4 w-4 shrink-0 text-text-muted opacity-0 transition-opacity group-hover/tile:opacity-100"
					strokeWidth={2.25}
				/>
			) : null}
		</>
	);

	const cls =
		"group/tile flex items-center gap-3 rounded-xl border border-border/60 bg-surface-alt/40 px-3.5 py-3 transition-colors hover:border-border-strong hover:bg-surface-alt";

	if (href) {
		return (
			<a href={href} target="_blank" rel="noreferrer" className={cls}>
				{body}
			</a>
		);
	}
	return <div className={cls}>{body}</div>;
}

function AboutEdit({
	profile,
	onCancel,
	onSave,
	busy,
}: {
	profile: Profile;
	onCancel: () => void;
	onSave: (patch: UpdateProfileRequest) => void | Promise<void>;
	busy: boolean;
}) {
	const [username, setUsername] = useState(profile.username ?? "");
	const [bio, setBio] = useState(profile.bio ?? "");
	const [phone, setPhone] = useState(profile.phone ?? "");
	const [city, setCity] = useState(profile.locationCity ?? "");
	const [country, setCountry] = useState(profile.locationCountry ?? "");
	const [website, setWebsite] = useState(profile.website ?? "");
	const [niche, setNiche] = useState(profile.niche);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onSave({
			username: username.trim() ? username.trim().toLowerCase() : null,
			bio: bio.trim() ? bio.trim() : null,
			phone: phone.trim() ? phone.trim() : null,
			locationCity: city.trim() ? city.trim() : null,
			locationCountry: country.trim() ? country.trim() : null,
			website: website.trim() ? website.trim() : null,
			niche,
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<div className="grid gap-5 sm:grid-cols-2">
				<AuthInput
					label="Username"
					placeholder="yourhandle"
					icon={Hash}
					value={username}
					onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
				/>
				<AuthInput
					label="Phone"
					placeholder="+91 98XXXXXXXX"
					icon={Phone}
					value={phone}
					onChange={(e) => setPhone(e.target.value)}
				/>
				<AuthInput
					label="City"
					placeholder="Bengaluru"
					value={city}
					onChange={(e) => setCity(e.target.value)}
				/>
				<AuthInput
					label="Country"
					placeholder="India"
					value={country}
					onChange={(e) => setCountry(e.target.value)}
				/>
				<AuthInput
					label="Website"
					placeholder="https://example.com"
					icon={Globe}
					value={website}
					onChange={(e) => setWebsite(e.target.value)}
					className="sm:col-span-2"
				/>
			</div>
			<TextArea
				label="Bio"
				placeholder="One line about you and what you make."
				value={bio}
				onChange={(e) => setBio(e.target.value)}
				maxLength={160}
			/>
			<NicheSelector value={niche} onChange={setNiche} />
			<FormFooter onCancel={onCancel} busy={busy} />
		</form>
	);
}

/* ---------------- Socials ---------------- */

function SocialsView({ profile }: { profile: Profile }) {
	const items = [
		{
			label: "Instagram",
			icon: Instagram,
			handle: profile.instagramHandle,
			urlFor: (h: string) => `https://instagram.com/${h}`,
		},
		{
			label: "TikTok",
			icon: Music2,
			handle: profile.tiktokHandle,
			urlFor: (h: string) => `https://www.tiktok.com/@${h}`,
		},
		{
			label: "YouTube",
			icon: Youtube,
			handle: profile.youtubeHandle,
			urlFor: (h: string) => `https://youtube.com/@${h}`,
		},
		{
			label: "X / Twitter",
			icon: Twitter,
			handle: profile.twitterHandle,
			urlFor: (h: string) => `https://x.com/${h}`,
		},
	];
	const anyHandle = items.some((i) => i.handle);
	if (!anyHandle) {
		return (
			<EmptyState
				icon={Instagram}
				title="No socials linked yet"
				description="Add your handles so your profile can link out to your work."
			/>
		);
	}
	return (
		<div className="grid gap-2 sm:grid-cols-2">
			{items
				.filter((i) => i.handle)
				.map((i) => {
					const Icon = i.icon;
					return (
						<a
							key={i.label}
							href={i.urlFor(i.handle!)}
							target="_blank"
							rel="noreferrer"
							className="group flex items-center gap-3 rounded-xl border border-border bg-surface-alt/50 px-3 py-2.5 transition-all hover:border-border-strong hover:bg-surface-alt"
						>
							<span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-pressed text-accent">
								<Icon className="h-4 w-4" strokeWidth={2.25} />
							</span>
							<div className="flex min-w-0 flex-1 flex-col leading-tight">
								<span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
									{i.label}
								</span>
								<span className="truncate text-[13px] font-semibold text-text-primary">
									@{i.handle}
								</span>
							</div>
							<ArrowUpRight
								className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
								strokeWidth={2.25}
							/>
						</a>
					);
				})}
		</div>
	);
}

/**
 * Accepts "@handle", "handle", or a full profile URL (ig.com/venky,
 * tiktok.com/@venky, youtube.com/@venky, x.com/venky, etc.) and returns
 * just the bare handle.
 */
function normalizeSocialHandle(raw: string): string {
	let v = raw.trim();
	if (!v) return v;
	v = v.replace(/^https?:\/\//i, "");
	v = v.replace(/^www\./i, "");
	v = v.replace(
		/^(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|twitter\.com|x\.com)\//i,
		"",
	);
	// Strip the remaining path after the handle + any query/hash.
	v = v.split(/[/?#]/)[0] ?? v;
	v = v.replace(/^@/, "");
	return v;
}

function SocialsEdit({
	profile,
	onCancel,
	onSave,
	busy,
}: {
	profile: Profile;
	onCancel: () => void;
	onSave: (patch: UpdateProfileRequest) => void | Promise<void>;
	busy: boolean;
}) {
	const [ig, setIg] = useState(profile.instagramHandle ?? "");
	const [tt, setTt] = useState(profile.tiktokHandle ?? "");
	const [yt, setYt] = useState(profile.youtubeHandle ?? "");
	const [tw, setTw] = useState(profile.twitterHandle ?? "");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const toHandle = (v: string) => {
			const normalised = normalizeSocialHandle(v);
			return normalised ? normalised : null;
		};
		onSave({
			instagramHandle: toHandle(ig),
			tiktokHandle: toHandle(tt),
			youtubeHandle: toHandle(yt),
			twitterHandle: toHandle(tw),
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-5">
			<div className="grid gap-5 sm:grid-cols-2">
				<AuthInput
					label="Instagram"
					icon={Instagram}
					placeholder="handle"
					value={ig}
					onChange={(e) => setIg(e.target.value.replace(/\s+/g, ""))}
				/>
				<AuthInput
					label="TikTok"
					icon={Music2}
					placeholder="handle"
					value={tt}
					onChange={(e) => setTt(e.target.value.replace(/\s+/g, ""))}
				/>
				<AuthInput
					label="YouTube"
					icon={Youtube}
					placeholder="handle"
					value={yt}
					onChange={(e) => setYt(e.target.value.replace(/\s+/g, ""))}
				/>
				<AuthInput
					label="X / Twitter"
					icon={Twitter}
					placeholder="handle"
					value={tw}
					onChange={(e) => setTw(e.target.value.replace(/\s+/g, ""))}
				/>
			</div>
			<FormFooter onCancel={onCancel} busy={busy} />
		</form>
	);
}

/* ---------------- Defaults ---------------- */

function DefaultsView({ profile }: { profile: Profile }) {
	const rows: Array<{ label: string; value: string | null }> = [
		{ label: "Tone", value: profile.defaultTone },
		{ label: "BGM mood", value: profile.defaultBgmMood },
		{ label: "Voice", value: profile.defaultVoice },
		{ label: "Signature CTA", value: profile.signatureCta },
	];
	return <DefinitionList rows={rows} />;
}

function DefaultsEdit({
	profile,
	onCancel,
	onSave,
	busy,
}: {
	profile: Profile;
	onCancel: () => void;
	onSave: (patch: UpdateProfileRequest) => void | Promise<void>;
	busy: boolean;
}) {
	const [tone, setTone] = useState(profile.defaultTone);
	const [bgm, setBgm] = useState(profile.defaultBgmMood);
	const [voice, setVoice] = useState(profile.defaultVoice ?? "");
	const [cta, setCta] = useState(profile.signatureCta ?? "");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		onSave({
			defaultTone: tone,
			defaultBgmMood: bgm,
			defaultVoice: voice.trim() ? voice.trim() : null,
			signatureCta: cta.trim() ? cta.trim() : null,
		});
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			<ToneSelector value={tone} onChange={setTone} />
			<BgmMoodSelector value={bgm} onChange={setBgm} />
			<AuthInput
				label="Default voice"
				icon={Palette}
				placeholder="e.g. alloy, warm-female-1"
				value={voice}
				onChange={(e) => setVoice(e.target.value)}
			/>
			<div className="flex flex-col gap-2">
				<AuthInput
					label="Signature CTA"
					icon={MessageSquareQuote}
					placeholder="Follow for more →"
					value={cta}
					onChange={(e) => setCta(e.target.value)}
					hint={
						cta
							? "Preview: appears at the end of generated captions."
							: undefined
					}
				/>
				{cta ? (
					<span className="inline-flex w-fit items-center rounded-full border border-border bg-surface-alt/60 px-3 py-1 text-[12px] font-medium text-text-secondary">
						{cta}
					</span>
				) : null}
			</div>
			<FormFooter onCancel={onCancel} busy={busy} />
		</form>
	);
}

/* ---------------- Shared bits ---------------- */

function DefinitionList({
	rows,
}: {
	rows: Array<{ label: string; value: string | null }>;
}) {
	return (
		<dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
			{rows.map((row) => (
				<div key={row.label} className="flex flex-col gap-0.5">
					<dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
						{row.label}
					</dt>
					<dd
						className={[
							"text-[14px] leading-relaxed",
							row.value ? "text-text-primary" : "italic text-text-muted",
						].join(" ")}
					>
						{row.value ?? "Not set"}
					</dd>
				</div>
			))}
		</dl>
	);
}

function FormFooter({ onCancel, busy }: { onCancel: () => void; busy: boolean }) {
	return (
		<div className="flex items-center justify-end gap-3 border-t border-border/60 pt-5">
			<Button
				type="button"
				variant="ghost"
				onClick={onCancel}
				disabled={busy}
			>
				Cancel
			</Button>
			<Button
				type="submit"
				loading={busy}
				iconRight={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
			>
				Save changes
			</Button>
		</div>
	);
}

function ProfileSkeleton() {
	return (
		<div className="mx-auto w-full max-w-6xl px-6 pt-6 sm:px-10 lg:px-14">
			<Skeleton className="h-[220px] w-full rounded-3xl" />
			<div className="mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
				<div className="hidden flex-col gap-2 lg:flex">
					<Skeleton className="h-6 w-32" />
					<Skeleton className="h-6 w-28" />
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-6 w-28" />
				</div>
				<div className="flex flex-col gap-6">
					<Skeleton className="h-48 w-full rounded-2xl" />
					<Skeleton className="h-40 w-full rounded-2xl" />
					<Skeleton className="h-40 w-full rounded-2xl" />
				</div>
			</div>
		</div>
	);
}
