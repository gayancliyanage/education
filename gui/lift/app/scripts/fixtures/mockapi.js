

'use strict';


var app = angular.module('liftApp');




var createSupervisor = function() {
  return {
    id: 1,
    name: 'Dr. Supervisor One',
    email: 'sup@lift.com'
  }
};

var createPhysician = function(count, supervisor) {
  var physicians = [];
  for(var i=0;i<count;i++) {
    var p = {
      id: i+1,
      name: 'Physician ' + (i+1),
      supervisor_id: supervisor.id
    };
    physicians.push(p);
  }
  return physicians;
};

var firstName = ['Daniel','Lucas','Carter','Noah','William','Owen'];
var lastName = ['Braxton','Brushwood','Oliver','Kewley','Gustavson','Johnson','Jones','Miller','Wilson','Anderson','Taylor','Thomas','Parker','Collins'];

var glucose = ['Metformin Oral','Glimepride','Onglyza','Prandin','Fortamet','Istamet','Cycloset'];
var bloodPressure = ['Diovan','Benicar','Azor','Coreg','Avalide','Altace','Ziac','Tenex','Amalong'];
var schedules = [[1,0,0],[0,0,1],[1,0,1],[1,1,1]];

var generateDOB = function() {
  var age = Math.floor(Math.random() * 40) + 40;
  var months = Math.floor(Math.random()*12);
  var totalDays = age * 365 + months * 30;
  var totalTimeInMS = totalDays * 24 * 60 * 60 * 1000;
  var date = new Date().getTime();
  var newTime = date - totalTimeInMS;
  return new Date(newTime);
};
var generateMedicine = function(bpCount, glucoseCount) {
  var prescriptions = [];
  var p = [];
  var id = 1;
  for(var i=0;i<bpCount;i++) {
    var index = Math.floor(Math.random() * bloodPressure.length);
    while(p.indexOf(index) != -1) {
      index = Math.floor(Math.random() * bloodPressure.length);
    }
    var schedIndex = Math.floor(Math.random() * schedules.length);
    var prescription = {
      id: id++,
      name: bloodPressure[index],
      type: 'tablet',
      dose: 1,
      schedule: schedules[schedIndex],
      date: new Date()
    };
    prescriptions.push(prescription);
    p.push(index);
  }
  for(i=0;i<glucoseCount;i++) {
    index = Math.floor(Math.random() * glucose.length);
    while(p.indexOf(index) != -1) {
      index = Math.floor(Math.random() * glucose.length);
    }
    schedIndex = Math.floor(Math.random() * schedules.length);
    prescription = {
      id: id++,
      name: glucose[index],
      type: 'tablet',
      dose: 1,
      schedule: schedules[schedIndex],
      date: new Date()
    };
    console
    prescriptions.push(prescription);
    p.push(index);
  }
  return prescriptions;
};
var generateBoolean = function() {
  var num = Math.floor(Math.random()*2);
  return num == 0;
};

var getName = function(source) {
  var index = Math.floor(Math.random() * source.length);
  return source[index];
};

var createPatient = function(id, physician) {
  var first = getName(firstName);
  var last = getName(lastName);
  var hasDiabetes = generateBoolean();
  var hasBP = generateBoolean();
  if (hasDiabetes == false) {
    hasBP = true;
  }
  var countBp = hasBP == true ? 3 : 0;
  var countGlucose = hasDiabetes == true ? 3 : 0;
  var meds = generateMedicine(countBp, countGlucose);
  var gender = generateBoolean() == true ? "male" : "female";
  return {
    id: id,
    physicianId: physician.id,
    firstName: first,
    lastName: last,
    name: first + ", " + last,
    address: 'Address of the patient ' + id,
    dateOfBirth: generateDOB(),
    gender: gender,
    phoneNumber: '1234567890',
    emailAddress: 'patient1@somewhere.com',
    monitor: {
      glucose: hasDiabetes,
      bloodPressure: hasBP
    },
    prescriptions:meds
  }
};


var supervisor = createSupervisor();
var physicians = createPhysician(3, supervisor);
var patients = [];
for(var i=0;i<15;i++) {
  var index = i % 3;
  var physician = physicians[index];
  var patient = createPatient(i+1,physician);
  patients.push(patient);
}

app.constant('Config', {
  useMocks: true,
  viewDir: 'views/',
  fakeDelay: 100
});

app.constant('SUPERVISOR', supervisor);
app.constant('PHYSICIAN', physicians);


app.constant('PATIENTS', {
  data: {
    patients: patients
  }
});