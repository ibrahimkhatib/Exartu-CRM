// Extending the user data that is sent to the client
Meteor.publish(null, function () {
    return Utils.filterCollectionByUserHier.call(this, Meteor.users.find({}, {
        fields: {
            'username': 1,
            'emails': 1,
            'services.google.picture': 1,
            'services.email': 1,
            'profilePictureId': 1,
            'hierId': 1,
            'hierRoles': 1,
            'createdAt': 1,
            'permissions': 1,
            'lastCustomerUsed': 1,
            'inactive': 1,
            'hierarchies': 1,
            'currentHierId': 1
        }
    }), {
        hierIdKeyName: 'hierarchies'
    });
});

// Publish user invitations
Meteor.publish('userInvitations', function () {
    return Utils.filterCollectionByUserHier.call(this, UserInvitations.find({}, {
        fields: {
            email: 1,
            sentBy: 1,
            createdAt: 1,
            used: 1
        }
    }));
});

Meteor.users.allow({
    update: function (userId, file, fields, modifier) {
        var user = Meteor.users.findOne({
            _id: userId
        });
        //console.log('user',userId,'file',file,'fields',fields,'modifier',modifier);
        // we get here with
        //   'userId' as the userID of the meteor user
        //   'file' is the user record being updated
        //   'fields' is an array of the fields being updated.
        //   'modifier' is the mongo update clause.  Example: { '$set': { hierarchies: [ 'e5fFGgw5EkTWv2L5R', 'F9w4wLZqMTu75bGS7' ] }
        //   some checks that need to happen here:
        //      verify that the meteor user doing the updating is either system admin or tenant admin
        //      verify that the if the systemadmin role is being added that the user is system admin
        //

        if (_.contains(fields, 'hierRoles')) {

            if (!RoleManager.bUserIsSystemAdmin(user)) {
                if (!RoleManager.bUserIsClientAdmin(user)) {
                    return false;
                }
                else {
                    if (modifier && modifier.$set && modifier.$set.hierRoles) {
                        _.each(modifier.$set.hierRoles, function (item) {
                            if (item.roles== RoleManager.getSystemAdministratorRole()._id) {

                                return false;
                            }
                        });
                    }
                }
            }
        };
         if (userId == file._id)
            return true;
        if (file.hierId != user.hierId) {
            if (!RoleManager.bUserIsSystemAdmin(user))
                return false;
        }
        return true;
        if (_.any(['dateCreated', 'hierId', 'services'], function (field) {
                return _.contains(fields, field);
            })) {
            return true;
        }
        else {
            if (!RoleManager.bUserIsSystemAdmin(user))
                if (!RoleManager.bUserIsClientAdmin(user))
                    return false;
        }
    }
});

//Meteor.publish("users", function () {
//  return Meteor.users.find({
//    hierId: Utils.getUserHierId(this.userId)
//  });
//});

// Users files

UsersFS = new Document.Collection({
    collection: Meteor.users
});
UsersFS.publish();