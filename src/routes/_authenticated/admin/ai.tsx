import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatDate, formatDateTime, PageHead, Pill, RowMenu, Tabs, useAdminActor } from "@/components/admin/shell";
import { ConfirmDialog } from "@/components/facilitator/ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  activeChatbotsUsing, chatbotsUsing, chatbotUsage, emptyChatbot, emptyModel, featureLabels, languageLabels, modelStatusLabels, modelTypeLabels, modelUsage, purposeLabels, purposesForType,
  restorePromptVersion, saveChatbot, saveModel, savePromptVersion, setChatbotStatus, setDefaultModel, setModelStatus, simulateChatbot, simulateModel, usable, validateChatbot, validateModel,
  type ChatbotValues, type ModelValues, type TestResult,
} from "@/lib/admin/ai";
import { useAdmin } from "@/lib/admin/store";
import type { AiModel, Chatbot, ChatbotFeature, ModelPurpose, ModelStatus, ModelType, PlatformLanguage } from "@/lib/admin/types";
import { crops } from "@/lib/mock/crops";
import { useLearningState } from "@/lib/mock/store";
import type { CropSlug } from "@/lib/mock/types";

type Tab = "chatbots" | "prompts" | "models" | "testing";
type Search = { tab?: Tab; bot?: string; model?: string };
const tabs: Tab[] = ["chatbots", "prompts", "models", "testing"];

export const Route = createFileRoute("/_authenticated/admin/ai")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    ...(tabs.includes(search["tab"] as Tab) ? { tab: search["tab"] as Tab } : {}),
    ...(typeof search["bot"] === "string" ? { bot: search["bot"] } : {}),
    ...(typeof search["model"] === "string" ? { model: search["model"] } : {}),
  }),
  component: AiPage,
});

const modelTone = { active: "ok", testing: "info", inactive: "muted", unavailable: "bad" } as const;
const allLanguages: PlatformLanguage[] = ["rw", "en", "fr"];

function AiPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/ai" });
  const tab = search.tab ?? "chatbots";
  const go = (next: Search) => navigate({ search: next });
  return <>
    <PageHead title="AI Management" text="Chatbots, their prompts and the model registry. Every response here is simulated: no AI provider is called and no API key is stored in the browser." />
    <Tabs value={tab} onChange={(value) => go({ tab: value })} options={[{ value: "chatbots", label: "Chatbots" }, { value: "prompts", label: "Prompts" }, { value: "models", label: "Model registry" }, { value: "testing", label: "Testing" }]} />
    {tab === "chatbots" && <Chatbots go={go} />}
    {tab === "prompts" && <Prompts botId={search.bot} go={go} />}
    {tab === "models" && <Models go={go} />}
    {tab === "testing" && <Testing botId={search.bot} modelId={search.model} />}
  </>;
}

function Chatbots({ go }: { go: (search: Search) => void }) {
  const admin = useAdmin();
  const learning = useLearningState();
  const { name } = useAdminActor();
  const [form, setForm] = useState<{ id: string | null; values: ChatbotValues } | null>(null);
  const [deactivating, setDeactivating] = useState<Chatbot | null>(null);
  const active = admin.chatbots.filter((bot) => bot.status === "active").length;
  function activate(bot: Chatbot) {
    const error = setChatbotStatus(name, bot.id, "active");
    if (error) toast.error(error); else toast.success(`${bot.name} activated.`);
  }
  return <>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">{active} of {admin.chatbots.length} chatbots active. Each chatbot must use a model from the registry.</p><Button onClick={() => setForm({ id: null, values: emptyChatbot(admin) })}><Plus aria-hidden />Add chatbot</Button></div>
    {!admin.chatbots.length ? <p className="fac-empty">No chatbots configured.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Chatbot</th><th>Used for</th><th>Model</th><th>Languages</th><th>Prompt</th><th>Requests</th><th>Status</th><th>Updated</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{admin.chatbots.map((bot) => { const model = admin.models.find((item) => item.id === bot.modelId); return <tr key={bot.id}>
        <td><b>{bot.name}</b><small className="block text-muted-foreground">{bot.purpose}</small></td>
        <td>{featureLabels[bot.feature]}</td>
        <td>{model ? model.name : "Missing model"}{!usable(model) && <small className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3" aria-hidden />{model ? `Model ${model.status}` : "Not in registry"}</small>}</td>
        <td>{bot.languages.map((code) => languageLabels[code]).join(", ")}</td>
        <td>v{bot.promptVersion}</td>
        <td>{chatbotUsage(admin, learning, bot)}</td>
        <td><Pill tone={bot.status === "active" ? "ok" : "muted"}>{bot.status === "active" ? "Active" : "Inactive"}</Pill></td>
        <td>{formatDate(bot.updatedAt)}</td>
        <td className="col-actions"><RowMenu label={bot.name}>
          <DropdownMenuItem onSelect={() => setForm({ id: bot.id, values: bot })}>Configure</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go({ tab: "prompts", bot: bot.id })}>Edit prompt</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go({ tab: "testing", bot: bot.id })}>Test</DropdownMenuItem>
          <DropdownMenuSeparator />
          {bot.status === "active" ? <DropdownMenuItem onSelect={() => setDeactivating(bot)}>Deactivate</DropdownMenuItem> : <DropdownMenuItem onSelect={() => activate(bot)}>Activate</DropdownMenuItem>}
        </RowMenu></td>
      </tr>; })}</tbody>
    </table></div>}
    <Dialog open={!!form} onOpenChange={(open) => { if (!open) setForm(null); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form?.id ? "Configure chatbot" : "Add a chatbot"}</DialogTitle><DialogDescription>Choose a registered model and how the chatbot behaves. Prompts are edited and versioned in the Prompts tab.</DialogDescription></DialogHeader>
        {form && <ChatbotForm initial={form.values} isNew={!form.id} onCancel={() => setForm(null)} onSubmit={(values, prompt) => { saveChatbot(name, values, form.id, prompt); toast.success(form.id ? "Chatbot saved." : "Chatbot added. Activate it when it is ready."); setForm(null); }} />}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!deactivating} onOpenChange={(open) => { if (!open) setDeactivating(null); }} title={`Deactivate ${deactivating?.name ?? ""}?`} text={deactivating ? `${featureLabels[deactivating.feature]} stops using it and users see the fallback message: “${deactivating.behavior.fallback}”` : ""} confirmLabel="Deactivate" onConfirm={() => { if (!deactivating) return; setChatbotStatus(name, deactivating.id, "inactive"); toast.success(`${deactivating.name} deactivated.`); setDeactivating(null); }} />
  </>;
}

function ChatbotForm({ initial, isNew, onSubmit, onCancel }: { initial: ChatbotValues; isNew: boolean; onSubmit: (values: ChatbotValues, prompt: string) => void; onCancel: () => void }) {
  const admin = useAdmin();
  const [values, setValues] = useState<ChatbotValues>({ name: initial.name, description: initial.description, purpose: initial.purpose, feature: initial.feature, modelId: initial.modelId, status: initial.status, languages: initial.languages, scope: initial.scope, behavior: initial.behavior });
  const [prompt, setPrompt] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateChatbot>>({});
  const set = <K extends keyof ChatbotValues>(key: K, value: ChatbotValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const behave = <K extends keyof ChatbotValues["behavior"]>(key: K, value: ChatbotValues["behavior"][K]) => setValues((current) => ({ ...current, behavior: { ...current.behavior, [key]: value } }));
  const llms = admin.models.filter((model) => model.type === "llm");
  const model = admin.models.find((item) => item.id === values.modelId);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateChatbot(values, isNew ? prompt : null);
    if (values.status === "active" && !usable(model)) found.status = "The chosen model is not active, so the chatbot must stay inactive.";
    setErrors(found);
    if (!Object.keys(found).length) onSubmit(values, prompt);
  }
  const err = (key: keyof typeof errors) => errors[key] && <span className="fac-field-error">{errors[key]}</span>;
  return <form className="admin-form" noValidate onSubmit={submit}>
    <div className="fac-row"><label>Name<input value={values.name} onChange={(event) => set("name", event.target.value)} />{err("name")}</label><label>Used for<select value={values.feature} onChange={(event) => set("feature", event.target.value as ChatbotFeature)}>{(Object.keys(featureLabels) as ChatbotFeature[]).map((item) => <option key={item} value={item}>{featureLabels[item]}</option>)}</select></label></div>
    <label>Purpose<input value={values.purpose} onChange={(event) => set("purpose", event.target.value)} placeholder="For example: answer farmer questions from their course" />{err("purpose")}</label>
    <label>Description (optional)<textarea rows={2} value={values.description} onChange={(event) => set("description", event.target.value)} /></label>
    <div className="fac-row">
      <label>Model<select value={values.modelId} onChange={(event) => set("modelId", event.target.value)}>{llms.map((item) => <option key={item.id} value={item.id}>{item.name} · {modelStatusLabels[item.status]}</option>)}</select>{err("modelId")}{model && !usable(model) && <span className="fac-field-error">This model is {model.status}. Requests will fail until another model is chosen.</span>}</label>
      <label>Status<select value={values.status} onChange={(event) => set("status", event.target.value as Chatbot["status"])}><option value="active">Active</option><option value="inactive">Inactive</option></select>{err("status")}</label>
    </div>
    <fieldset className="fac-formats"><legend>Languages</legend>{allLanguages.map((code) => <label key={code}><input type="checkbox" checked={values.languages.includes(code)} onChange={(event) => set("languages", event.target.checked ? [...values.languages, code] : values.languages.filter((item) => item !== code))} />{languageLabels[code]}</label>)}</fieldset>{err("languages")}
    <label>Scope<textarea rows={2} value={values.scope} onChange={(event) => set("scope", event.target.value)} placeholder="What it may and may not talk about" /></label>
    <div className="fac-row">
      <label>Tone<select value={values.behavior.tone} onChange={(event) => behave("tone", event.target.value as "simple" | "formal")}><option value="simple">Simple, farmer-friendly</option><option value="formal">Formal</option></select></label>
      <label>Maximum answer length (words)<input type="number" min={20} max={2000} value={values.behavior.maxWords} onChange={(event) => behave("maxWords", event.target.valueAsNumber)} /></label>
    </div>
    <label className="flex items-center gap-2"><input type="checkbox" checked={values.behavior.groundedOnly} onChange={(event) => behave("groundedOnly", event.target.checked)} />Only answer from approved course and knowledge content</label>
    <label className="flex items-center gap-2"><input type="checkbox" checked={values.behavior.refuseRestricted} onChange={(event) => behave("refuseRestricted", event.target.checked)} />Refuse chemical doses and other restricted advice</label>
    <label>Fallback message<input value={values.behavior.fallback} onChange={(event) => behave("fallback", event.target.value)} />{err("behavior")}</label>
    {isNew && <label>System instructions (first prompt version)<textarea rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />{err("prompt")}</label>}
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{isNew ? "Add chatbot" : "Save configuration"}</Button></DialogFooter>
  </form>;
}

function Prompts({ botId, go }: { botId: string | undefined; go: (search: Search) => void }) {
  const admin = useAdmin();
  const learning = useLearningState();
  const { name } = useAdminActor();
  const bot = admin.chatbots.find((item) => item.id === botId) ?? admin.chatbots[0];
  const [draft, setDraft] = useState(bot?.prompt ?? "");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [question, setQuestion] = useState("Ni ryari nshyira ifumbire ku nyanya?");
  const [restoring, setRestoring] = useState<number | null>(null);
  useEffect(() => { setDraft(bot?.prompt ?? ""); setResult(null); setNote(""); }, [bot?.id, bot?.prompt]);
  if (!bot) return <p className="fac-empty">No chatbots configured.</p>;
  const current = bot;
  const course = learning.courses.find((item) => item.status === "published");
  async function test() {
    setTesting(true);
    setResult(await simulateChatbot(current, learning, { question, courseId: course?.id ?? "", crop: course?.crop ?? "tomato", language: current.languages.includes("rw") ? "rw" : "en", prompt: draft }));
    setTesting(false);
  }
  return <div className="admin-grid-2">
    <article className="admin-panel admin-form">
      <label>Chatbot<select value={bot.id} onChange={(event) => go({ tab: "prompts", bot: event.target.value })}>{admin.chatbots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <p className="text-sm text-muted-foreground">Version in use: v{bot.promptVersion}. Saving creates a new version; older versions can be restored.</p>
      <label>System instructions<textarea rows={12} value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
      <label>Change note (optional)<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="What changed and why" /></label>
      <div className="admin-actions"><Button disabled={draft.trim() === bot.prompt.trim()} onClick={() => { const error = savePromptVersion(name, current.id, draft, note); if (error) toast.error(error); else { toast.success("New prompt version saved."); setNote(""); } }}>Save as new version</Button><Button variant="outline" disabled={draft === bot.prompt} onClick={() => setDraft(bot.prompt)}>Discard changes</Button></div>
      <div className="border-t pt-3"><label>Test question<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label><Button className="mt-2" variant="outline" disabled={testing || !question.trim()} onClick={() => void test()}>{testing ? "Testing…" : "Test this draft"}</Button></div>
      {result && <TestOutput result={result} />}
    </article>
    <article className="admin-panel"><h2 className="mb-2 font-bold">Versions</h2>
      <div className="staff-table"><table className="w-full text-sm">
        <thead><tr><th>Version</th><th>Note</th><th>Saved</th><th className="col-actions">Actions</th></tr></thead>
        <tbody>{bot.versions.map((version) => <tr key={version.version}><td>v{version.version}{version.version === bot.promptVersion && <small className="block text-primary">In use</small>}</td><td>{version.note}</td><td>{formatDateTime(version.at)}<small className="block text-muted-foreground">{version.by}</small></td>
          <td className="col-actions"><RowMenu label={`version ${version.version}`}><DropdownMenuItem onSelect={() => setDraft(version.body)}>Load into editor</DropdownMenuItem>{version.version !== bot.promptVersion && <DropdownMenuItem onSelect={() => setRestoring(version.version)}>Restore this version</DropdownMenuItem>}</RowMenu></td></tr>)}</tbody>
      </table></div>
    </article>
    <ConfirmDialog open={restoring !== null} onOpenChange={(open) => { if (!open) setRestoring(null); }} title={`Restore v${restoring ?? ""}?`} text="Its text is saved as a new version and used straight away. The current version stays in the history." confirmLabel="Restore" onConfirm={() => { if (restoring === null) return; const error = restorePromptVersion(name, current.id, restoring); if (error) toast.error(error); else toast.success(`v${restoring} restored as a new version.`); setRestoring(null); }} />
  </div>;
}

type StatusChange = { model: AiModel; status: ModelStatus } | null;

function Models({ go }: { go: (search: Search) => void }) {
  const admin = useAdmin();
  const learning = useLearningState();
  const { name } = useAdminActor();
  const [form, setForm] = useState<{ id: string | null; values: ModelValues } | null>(null);
  const [change, setChange] = useState<StatusChange>(null);
  const [usage, setUsage] = useState<AiModel | null>(null);
  const affected = change ? activeChatbotsUsing(admin, change.model.id) : [];
  function apply(model: AiModel, status: ModelStatus) {
    setModelStatus(name, model.id, status);
    toast.success(`${model.name} is now ${modelStatusLabels[status].toLowerCase()}.`);
  }
  function requestStatus(model: AiModel, status: ModelStatus) {
    if (status === "active" || status === "testing") apply(model, status);
    else setChange({ model, status });
  }
  return <>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-muted-foreground">Registry records only. Provider credentials never live in the browser; a server-side secret store would hold them.</p><Button onClick={() => setForm({ id: null, values: emptyModel() })}><Plus aria-hidden />Add model</Button></div>
    <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>Model</th><th>Type</th><th>Provider</th><th>Version</th><th>Purpose</th><th>Languages</th><th>Status</th><th>Default for</th><th>Used by</th><th>Updated</th><th className="col-actions">Actions</th></tr></thead>
      <tbody>{admin.models.map((model) => { const bots = chatbotsUsing(admin, model.id); return <tr key={model.id}>
        <td><b>{model.name}</b>{model.notes && <small className="block text-muted-foreground">{model.notes}</small>}</td>
        <td>{modelTypeLabels[model.type]}</td>
        <td>{model.provider}</td>
        <td>{model.version}</td>
        <td>{model.purposes.map((purpose) => purposeLabels[purpose]).join(", ")}</td>
        <td>{model.languages.map((code) => languageLabels[code]).join(", ")}</td>
        <td><Pill tone={modelTone[model.status]}>{modelStatusLabels[model.status]}</Pill></td>
        <td>{model.defaultFor.length ? model.defaultFor.map((purpose) => <span key={purpose} className="type-pill mr-1">Default · {purposeLabels[purpose]}</span>) : "—"}</td>
        <td>{bots.length ? bots.map((bot) => bot.name).join(", ") : "—"}</td>
        <td>{formatDate(model.updatedAt)}</td>
        <td className="col-actions"><RowMenu label={model.name}>
          <DropdownMenuItem onSelect={() => setForm({ id: model.id, values: model })}>Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setUsage(model)}>View usage</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => go({ tab: "testing", model: model.id })}>Test</DropdownMenuItem>
          <DropdownMenuSeparator />
          {model.status !== "active" && <DropdownMenuItem onSelect={() => requestStatus(model, "active")}>Activate</DropdownMenuItem>}
          {model.status !== "testing" && <DropdownMenuItem onSelect={() => requestStatus(model, "testing")}>Mark as testing</DropdownMenuItem>}
          {model.status !== "inactive" && <DropdownMenuItem onSelect={() => requestStatus(model, "inactive")}>Deactivate</DropdownMenuItem>}
          {model.status !== "unavailable" && <DropdownMenuItem onSelect={() => requestStatus(model, "unavailable")}>Mark unavailable</DropdownMenuItem>}
          {model.status === "active" && model.purposes.filter((purpose) => !model.defaultFor.includes(purpose)).map((purpose) => <DropdownMenuItem key={purpose} onSelect={() => { const error = setDefaultModel(name, model.id, purpose); if (error) toast.error(error); else toast.success(`${model.name} is now the default for ${purposeLabels[purpose].toLowerCase()}.`); }}>Set as default for {purposeLabels[purpose].toLowerCase()}</DropdownMenuItem>)}
        </RowMenu></td>
      </tr>; })}</tbody>
    </table></div>
    <Dialog open={!!form} onOpenChange={(open) => { if (!open) setForm(null); }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>{form?.id ? "Edit model" : "Add a model"}</DialogTitle><DialogDescription>Describe the model. Do not paste API keys: the form refuses anything that looks like a secret.</DialogDescription></DialogHeader>
        {form && <ModelForm initial={form.values} modelId={form.id} onCancel={() => setForm(null)} onSubmit={(values) => { saveModel(name, values, form.id); toast.success(form.id ? "Model saved." : "Model added to the registry."); setForm(null); }} />}
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={!!change} onOpenChange={(open) => { if (!open) setChange(null); }} title={change ? `${change.status === "inactive" ? "Deactivate" : "Mark unavailable"}: ${change.model.name}?` : ""}
      text={change ? `${affected.length ? `Warning: ${affected.map((bot) => bot.name).join(", ")} ${affected.length === 1 ? "uses" : "use"} this model and will fail until you assign another model. ` : ""}${change.model.defaultFor.length ? "It also stops being a default model. " : ""}You can activate it again later.` : ""}
      confirmLabel={change?.status === "inactive" ? "Deactivate" : "Mark unavailable"} onConfirm={() => { if (change) apply(change.model, change.status); setChange(null); }} />
    <Dialog open={!!usage} onOpenChange={(open) => { if (!open) setUsage(null); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Usage: {usage?.name}</DialogTitle><DialogDescription>{usage ? `${modelUsage(admin, learning, usage.id)} simulated request(s) through this model.` : ""}</DialogDescription></DialogHeader>
        {usage && (chatbotsUsing(admin, usage.id).length ? <ul className="fac-list">{chatbotsUsing(admin, usage.id).map((bot) => <li key={bot.id}><span><b>{bot.name}</b><small className="block text-muted-foreground">{featureLabels[bot.feature]} · {bot.status}</small></span><small>{chatbotUsage(admin, learning, bot)} requests</small></li>)}</ul> : <p className="fac-empty">No chatbot uses this model.</p>)}
        <DialogFooter><Button variant="outline" onClick={() => setUsage(null)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function ModelForm({ initial, modelId, onSubmit, onCancel }: { initial: ModelValues; modelId: string | null; onSubmit: (values: ModelValues) => void; onCancel: () => void }) {
  const admin = useAdmin();
  const [values, setValues] = useState<ModelValues>({ name: initial.name, type: initial.type, provider: initial.provider, version: initial.version, purposes: initial.purposes, languages: initial.languages, status: initial.status, notes: initial.notes });
  const [errors, setErrors] = useState<ReturnType<typeof validateModel>>({});
  const set = <K extends keyof ModelValues>(key: K, value: ModelValues[K]) => setValues((current) => ({ ...current, [key]: value }));
  const affected = modelId && (values.status === "inactive" || values.status === "unavailable") ? activeChatbotsUsing(admin, modelId) : [];
  const err = (key: keyof ModelValues) => errors[key] && <span className="fac-field-error">{errors[key]}</span>;
  return <form className="admin-form" noValidate onSubmit={(event) => { event.preventDefault(); const found = validateModel(values, modelId); setErrors(found); if (!Object.keys(found).length) onSubmit(values); }}>
    <div className="fac-row"><label>Model name<input value={values.name} onChange={(event) => set("name", event.target.value)} />{err("name")}</label><label>Type<select value={values.type} onChange={(event) => { const type = event.target.value as ModelType; setValues((current) => ({ ...current, type, purposes: purposesForType[type].slice(0, 1) })); }}>{(Object.keys(modelTypeLabels) as ModelType[]).map((item) => <option key={item} value={item}>{modelTypeLabels[item]}</option>)}</select></label></div>
    <div className="fac-row"><label>Provider<input value={values.provider} onChange={(event) => set("provider", event.target.value)} />{err("provider")}</label><label>Version<input value={values.version} onChange={(event) => set("version", event.target.value)} /></label><label>Status<select value={values.status} onChange={(event) => set("status", event.target.value as ModelStatus)}>{(Object.keys(modelStatusLabels) as ModelStatus[]).map((item) => <option key={item} value={item}>{modelStatusLabels[item]}</option>)}</select></label></div>
    {affected.length > 0 && <p className="fac-error">Warning: {affected.map((bot) => bot.name).join(", ")} use this model and will fail while it is {values.status}.</p>}
    <fieldset className="fac-formats"><legend>Purpose</legend>{purposesForType[values.type].map((purpose) => <label key={purpose}><input type="checkbox" checked={values.purposes.includes(purpose)} onChange={(event) => set("purposes", event.target.checked ? [...values.purposes, purpose] : values.purposes.filter((item) => item !== purpose))} />{purposeLabels[purpose]}</label>)}</fieldset>{err("purposes")}
    <fieldset className="fac-formats"><legend>Supported languages</legend>{allLanguages.map((code) => <label key={code}><input type="checkbox" checked={values.languages.includes(code)} onChange={(event) => set("languages", event.target.checked ? [...values.languages, code] : values.languages.filter((item) => item !== code))} />{languageLabels[code]}</label>)}</fieldset>{err("languages")}
    <label>Notes (optional)<textarea rows={2} value={values.notes} onChange={(event) => set("notes", event.target.value)} />{err("notes")}</label>
    <DialogFooter><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit">{modelId ? "Save model" : "Add model"}</Button></DialogFooter>
  </form>;
}

function TestOutput({ result }: { result: TestResult }) {
  const tone = result.ok ? "ok" : result.outcome === "refused" || result.outcome === "outside" || result.outcome === "fallback" ? "warn" : "bad";
  return <div className="admin-panel mt-3 space-y-2 text-sm" aria-live="polite">
    <div className="admin-actions items-center"><Pill tone={tone}>{result.outcome}</Pill><span className="text-muted-foreground">Model: {result.modelName} · {result.latencyMs} ms · simulated</span></div>
    <p className="whitespace-pre-line">{result.text}</p>
    {result.audioUrl && <audio controls src={result.audioUrl} className="w-full" />}
    {result.notes.map((item) => <p key={item} className="text-muted-foreground">{item}</p>)}
  </div>;
}

function Testing({ botId, modelId }: { botId: string | undefined; modelId: string | undefined }) {
  const admin = useAdmin();
  const learning = useLearningState();
  const published = learning.courses.filter((course) => course.status === "published");
  const [bot, setBot] = useState(botId ?? admin.chatbots[0]?.id ?? "");
  const [question, setQuestion] = useState("Ni ryari nshyira ifumbire ku nyanya?");
  const [courseId, setCourseId] = useState(published[0]?.id ?? "");
  const [crop, setCrop] = useState<CropSlug>("tomato");
  const [language, setLanguage] = useState<"rw" | "en">("rw");
  const [botResult, setBotResult] = useState<TestResult | null>(null);
  const [model, setModel] = useState(modelId ?? admin.models[0]?.id ?? "");
  const [purpose, setPurpose] = useState<ModelPurpose>("chat");
  const [input, setInput] = useState("Uburyo bwo kuhira inyanya");
  const [modelResult, setModelResult] = useState<TestResult | null>(null);
  const [busy, setBusy] = useState<"bot" | "model" | null>(null);
  const chosenBot = admin.chatbots.find((item) => item.id === bot);
  const chosenModel = admin.models.find((item) => item.id === model);
  const assigned = admin.models.find((item) => item.id === chosenBot?.modelId);
  useEffect(() => { if (chosenModel && !chosenModel.purposes.includes(purpose)) setPurpose(chosenModel.purposes[0] ?? "chat"); }, [chosenModel, purpose]);
  const log = admin.aiEvents.filter((event) => event.source === "test").slice(0, 8);
  return <>
    <div className="admin-grid-2">
      <article className="admin-panel admin-form"><h2 className="font-bold">Test a chatbot</h2>
        <label>Chatbot<select value={bot} onChange={(event) => { setBot(event.target.value); setBotResult(null); }}>{admin.chatbots.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {chosenBot && <p className="text-sm text-muted-foreground">Assigned model: <b>{assigned?.name ?? "missing"}</b>{assigned ? ` (${modelStatusLabels[assigned.status].toLowerCase()})` : ""} · {chosenBot.status === "active" ? "chatbot active" : "chatbot inactive"}</p>}
        <label>{chosenBot?.feature === "farmer_assistant" ? "Farmer question" : "Topic"}<input value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
        <div className="fac-row">
          {chosenBot?.feature === "farmer_assistant" ? <label>Course<select value={courseId} onChange={(event) => setCourseId(event.target.value)}>{published.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label> : <label>Crop<select value={crop} onChange={(event) => setCrop(event.target.value as CropSlug)}>{crops.map((item) => <option key={item.slug} value={item.slug}>{item.name_en}</option>)}</select></label>}
          <label>Language<select value={language} onChange={(event) => setLanguage(event.target.value as "rw" | "en")}><option value="rw">Kinyarwanda</option><option value="en">English</option></select></label>
        </div>
        <Button disabled={!chosenBot || busy !== null || !question.trim()} onClick={async () => { if (!chosenBot) return; setBusy("bot"); setBotResult(await simulateChatbot(chosenBot, learning, { question, courseId, crop, language })); setBusy(null); }}>{busy === "bot" ? "Waiting for response…" : "Send test"}</Button>
        {botResult && <TestOutput result={botResult} />}
      </article>
      <article className="admin-panel admin-form"><h2 className="font-bold">Test a model</h2>
        <label>Model<select value={model} onChange={(event) => { setModel(event.target.value); setModelResult(null); }}>{admin.models.map((item) => <option key={item.id} value={item.id}>{item.name} · {modelStatusLabels[item.status]}</option>)}</select></label>
        <label>Purpose<select value={purpose} onChange={(event) => setPurpose(event.target.value as ModelPurpose)}>{(chosenModel?.purposes ?? []).map((item) => <option key={item} value={item}>{purposeLabels[item]}</option>)}</select></label>
        <label>Sample input<textarea rows={3} value={input} onChange={(event) => setInput(event.target.value)} /></label>
        <Button disabled={!chosenModel || busy !== null} onClick={async () => { if (!chosenModel) return; setBusy("model"); setModelResult(await simulateModel(chosenModel, purpose, input, learning)); setBusy(null); }}>{busy === "model" ? "Waiting for response…" : "Run test"}</Button>
        {modelResult && <TestOutput result={modelResult} />}
      </article>
    </div>
    <section className="mt-6"><h2 className="mb-2 text-xl">Recent tests</h2>{!log.length ? <p className="fac-empty">No tests run yet.</p> : <div className="staff-table"><table className="w-full text-sm">
      <thead><tr><th>When</th><th>Input</th><th>Chatbot</th><th>Model</th><th>Result</th><th>Latency</th></tr></thead>
      <tbody>{log.map((event) => <tr key={event.id}><td>{formatDateTime(event.at)}</td><td>{event.question}</td><td>{admin.chatbots.find((item) => item.id === event.chatbotId)?.name ?? "—"}</td><td>{admin.models.find((item) => item.id === event.modelId)?.name ?? "—"}</td><td><Pill tone={event.ok ? "ok" : event.flagged ? "warn" : "bad"}>{event.ok ? "Succeeded" : event.flagged ? "Refused" : "Failed"}</Pill></td><td>{event.latencyMs} ms</td></tr>)}</tbody>
    </table></div>}</section>
  </>;
}
