//
//
//
RoleManager = {
    getRoleFromName: function (name) {
        return Roles.findOne({name: name});
    },
    getRoleFromId: function (id) {
        return Roles.findOne({_id: id});
    },
    getSystemAdministratorRole: function () {
        return RoleManager.getRoleFromName(Enums.roleFunction.System_Administrator);
    },
    getClientAdministratorRole: function () {
        return RoleManager.getRoleFromName(Enums.roleFunction.Client_Administrator);
    },
    getUserRoleIds: function (user) {
        if (!user) return [];
        if (!user.hierRoles) return [];
        var hr = _.findWhere(user.hierRoles, {hierId: user.currentHierId});
        var roleIds = (hr) ? hr.roleIds : [];
        return roleIds;
    },
    bUserHasRoleId: function (user, id) {
        var roleIds = RoleManager.getUserRoleIds(user);
        if (!_.contains(roleIds, id)) return false;
        return true;
    },
    bUserHasRoleName: function (user, name) {
        if (!_.contains(RoleManager.getUserRoleIds(user), RoleManager.getRoleFromName(name)._id)) return false;
        return true;
    },
    bUserIsSystemAdmin: function (user) {
        if (!user) {
            try {
                user = Meteor.user();
            }
            catch (err) {
                user = Meteor.users.findOne({_id: this.userId});
            }
            if (!user) return false;
        }
        var admins = String(ExartuConfig.AdminEmails).trim().split(',');
        if (user && user.emails[0] && _.contains(admins, user.emails[0].address.toLowerCase())) return true;
        return RoleManager.bUserHasRoleId(user, this.getSystemAdministratorRole()._id)
    }
    ,
    bUserIsClientAdmin: function (user) {
        var role = this.getClientAdministratorRole();
        if (role && role._id)
            return RoleManager.bUserHasRoleId(user, role._id);
        else
            return false;
    }
    ,
    bUserIsAdmin: function (user) {
        return (RoleManager.bUserIsClientAdmin(user) || RoleManager.bUserIsSystemAdmin(user));
    }

};
