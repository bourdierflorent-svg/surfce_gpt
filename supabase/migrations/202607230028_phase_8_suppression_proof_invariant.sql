update public.compliance_settings
set retain_suppression_proof = true
where not retain_suppression_proof;

alter table public.compliance_settings
add constraint compliance_settings_suppression_proof_required
check (retain_suppression_proof);

comment on constraint compliance_settings_suppression_proof_required
on public.compliance_settings is
'Proof of opposition is a non-configurable compliance invariant.';
