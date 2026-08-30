package authz

const (
	ResourceInvitation     = "invitation"
	ActionInvitationCreate = "create"
	ActionInvitationUpdate = "update"
	ActionInvitationDelete = "delete"
)

var (
	InvitationRead   = Permission{Resource: ResourceInvitation, Action: ActionRead}
	InvitationCreate = Permission{Resource: ResourceInvitation, Action: ActionInvitationCreate}
	InvitationUpdate = Permission{Resource: ResourceInvitation, Action: ActionInvitationUpdate}
	InvitationDelete = Permission{Resource: ResourceInvitation, Action: ActionInvitationDelete}
)

func init() {
	RegisterResource(ResourceDefinition{
		Resource: ResourceInvitation,
		LabelKey: "Invitation Management",
		Actions: []ActionDefinition{
			{Action: ActionRead, LabelKey: "Read invitations", DescriptionKey: "View individual invitation codes.", DefaultRoles: []string{BuiltInRoleAdmin}},
			{Action: ActionInvitationCreate, LabelKey: "Create invitations", DescriptionKey: "Generate invitation codes.", DefaultRoles: []string{BuiltInRoleAdmin}},
			{Action: ActionInvitationUpdate, LabelKey: "Update invitations", DescriptionKey: "Edit or enable and disable invitation codes.", DefaultRoles: []string{BuiltInRoleAdmin}},
			{Action: ActionInvitationDelete, LabelKey: "Delete invitations", DescriptionKey: "Delete individual invitation codes.", DefaultRoles: []string{BuiltInRoleAdmin}},
		},
	})
}
