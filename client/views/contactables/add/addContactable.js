ContactableAddController = RouteController.extend({
  data: function(){
    Session.set('objType',this.params.objType);
  },
  waitOn: function () {
    return Meteor.subscribe('lookUps');
  },
  action: function () {
    if (!this.ready()) {
      this.render('loadingContactable');
      return;
    }
    this.render('addContactablePage');
  },
  onAfterAction: function() {
    var title = 'Add ' + Session.get('objType'),
      description = '';
    SEO.set({
      title: title,
      meta: {
        'description': description
      },
      og: {
        'title': title,
        'description': description
      }
    });
  }
});

var contactable;
var subTypesDep=new Deps.Dependency;

var createContactable= function(objTypeName, options){
  var type= dType.core.getObjType(objTypeName);
  contactable= new dType.objTypeInstance(objTypeName, options);
  setPersonType(type.defaultPersonType,contactable);
  return contactable
};

var setPersonType= function(personType, contactable){
  var personModel= new dType.objTypeInstance(personType);
  contactable.subTypes=contactable.subTypes.filter(function(obj) {
    return [Enums.personType.human, Enums.personType.organization].indexOf(obj.name) === -1;
  });
  contactable.subTypes.unshift(personModel);
  subTypesDep.changed();
};

var extraInformation = new Utils.ObjectDefinition({
  reactiveProps: {
    email: {
      validator: function() {
        return helper.emailRE.test(this.value);
      }
    },
    phoneNumber: {}
  }
});

var emailType = undefined;
var phoneType = undefined;

var addDisabled = new ReactiveVar(false);
Template.addContactablePage.created=function(){
  addDisabled.set(false);
};
Template.addContactablePage.helpers({
  addDisabled: function () {
    return addDisabled.get();
  },
  contactable: function(){
    if (!contactable){
      var options=Session.get('options');
      if (options){
        Session.set('options',undefined);
      }
      contactable=createContactable(Session.get('objType'), options);
    }
    return contactable;
  },
  subTypeArray: function(){
    subTypesDep.depend();
    return contactable.subTypes;
  },
  objTypeName: function(){
    return Session.get('objType');
  },
  selected:function(personType){
    subTypesDep.depend();
    return contactable && contactable.subTypes && !!_.findWhere(contactable.subTypes,{name: personType});
  },
  getIcon: function(){
    var current=Router.current();
    if (!current) return '';
    return helper.getIconForObjName(current.params.objType)
  },
  extraInformation: function() {
    return extraInformation;
  },
  getPhoneTypes: function () {
    return LookUps.find(
      {
        lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode,
        lookUpActions: { $in: [
          Enums.lookUpAction.ContactMethod_Phone,
          Enums.lookUpAction.ContactMethod_MobilePhone,
          Enums.lookUpAction.ContactMethod_WorkPhone,
          Enums.lookUpAction.ContactMethod_HomePhone
        ]}
      }).map(function (type) {
        return {text: type.displayName, id: type._id};
      });
  },
  getDefaultPhoneType: function () {
    // it depends on what contactable type is being created
    var lookUpAction;
    switch (Session.get('objType')) {
      case 'Client': lookUpAction = Enums.lookUpAction.ContactMethod_WorkPhone; break;
      case 'Employee': lookUpAction = Enums.lookUpAction.ContactMethod_MobilePhone; break;
      case 'Contact': lookUpAction = Enums.lookUpAction.ContactMethod_MobilePhone; break;
    }

    var type = LookUps.findOne({lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode, lookUpActions: lookUpAction});
    // if the lookup for the specific lookupAction is not found, use the default email type
    if (!type)
      type = LookUps.findOne({lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode, lookUpActions: Enums.lookUpAction.ContactMethod_Phone});
    phoneType = type._id;

    return function (e, cb) {
      cb({id: type._id, text: type.displayName});
    }
  },
  setPhoneType: function () {
    return function (typeId) {
      phoneType = typeId;
    }
  },
  getEmailTypes: function () {
    return LookUps.find(
      {
        lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode,
        lookUpActions: { $in: [Enums.lookUpAction.ContactMethod_Email, Enums.lookUpAction.ContactMethod_WorkEmail, Enums.lookUpAction.ContactMethod_PersonalEmail ]}
      }).map(function (type) {
        return {text: type.displayName, id: type._id};
      });
  },
  getDefaultEmailType: function () {
    // it depends on what contactable type is being created
    var lookUpAction;
    switch (Session.get('objType')) {
      case 'Client': lookUpAction = Enums.lookUpAction.ContactMethod_WorkEmail; break;
      case 'Employee': lookUpAction = Enums.lookUpAction.ContactMethod_PersonalEmail; break;
      case 'Contact': lookUpAction = Enums.lookUpAction.ContactMethod_PersonalEmail; break;
    }

    var type = LookUps.findOne({lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode, lookUpActions: lookUpAction});
    // if the lookup for the specific lookupAction is not found, use the default email type
    if (!type)
      type = LookUps.findOne({lookUpCode: Enums.lookUpTypes.contactMethod.type.lookUpCode, lookUpActions: Enums.lookUpAction.ContactMethod_Email});

    emailType = type._id;

    return function (e, cb) {
      cb({id: type._id, text: type.displayName});
    }
  },
  setEmailType: function () {
    return function (typeId) {
      emailType = typeId;
    }
  }
});

Template.addContactablePage.events({
  'change #personType': function(e){
    setPersonType(e.target.value, contactable)
  },
  'click .btn-success': function(){
    if (!dType.isValid(this)){
      dType.displayAllMessages(this);
      return;
    }
    var cont = dType.buildAddModel(this);

    // Extend contactable with extra information
    // - Contact methods
    cont.contactMethods = [];
    if (extraInformation.email.value) {
      if (extraInformation.email.error.hasError)
        return;

      cont.contactMethods.push({
        type: emailType,
        value: extraInformation.email.value
      });
    }
    if (extraInformation.phoneNumber.value) {
      if (extraInformation.phoneNumber.error.hasError)
        return;

      cont.contactMethods.push({
        type: phoneType,
        value: extraInformation.phoneNumber.value
      });
    }
    var email = extraInformation.email.value;
    extraInformation.reset();
    addDisabled.set(true);
    if(email){
      Meteor.call('checkContactableEmail',email, function(err, res){
        if(err){
          console.log("Error checking email");

        }
        else{
          if(res.length > 0){
            //there is some contactables with same email
            var listaString = "";
            _.forEach(res, function(r){
              var link = ""+window.location.origin+"/contactable/"+ r._id;
              listaString = listaString  + "<a target='_blank' href="+link+">"+r.displayName+"</a>"+"<br/>";
            });
            Utils.showModal('basicModal', {
              title: 'Existing email',
              message: 'The following contactables have the same email you are trying to use:<br/><br/>'+listaString,
              buttons: [{label: 'Cancel', classes: 'btn-info', value: false}, {
                label: 'Continue',
                classes: 'btn-success',
                value: true
              }],
              callback: function (result) {
                if(result){
                  Meteor.call('addContactable', cont, function(err, result){
                    addDisabled.set(false);
                    if(err){
                      alert('Error adding record:'+ err);
                      console.dir(err);
                    }else{
                      Router.go('/contactable/' + result + '#tasks');
                    };
                  });
                }
                else{
                  addDisabled.set(false);
                }
              }
            });
          }else{
            Meteor.call('addContactable', cont, function(err, result){
              addDisabled.set(false);
              if(err){
                alert('Error adding record:'+ err);
                console.dir(err);
              }else{
                Router.go('/contactable/' + result + '#tasks');
              };
            });
          }
        }
      })
    }
    else {
      extraInformation.reset();
      addDisabled.set(true);
      Meteor.call('addContactable', cont, function (err, result) {
        addDisabled.set(false);
        if (err) {
          alert('Error adding record:' + err);
          console.dir(err);
        } else {
          Router.go('/contactable/' + result + '#tasks');
        }
        ;
      });
    }
  },
  'click .goBack': function(){
    history.back();
  }
});

Template.addContactablePage.destroyed=function(){
  contactable = undefined;
};