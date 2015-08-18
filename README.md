# Student Dashboard [![Build Status](https://travis-ci.org/SingaporeClouds/education.png?branch=master)](https://travis-ci.org/SingaporeClouds/education)


## Requirements


### Sofwares

- a Bash terminal
- Python 2.7
- virtualenv
- Ruby 1.8+
- git
- make


### Google projects

You will need 3 Google projects: one project for the back-end and one project
for each Google Apps (Dashboard and LIFT).

You can create and manage your project at
[https://console.developers.google.com/](https://console.developers.google.com/).
Take note the project ID of the back-end project.

You can retrieve it on the project overview page ("Monitor" > "Overview";
the top of the page should have show the "Project ID").

If you used the default random id, it should be something like "student-dashboard-660"
for example; we will use that ID to illustrate some of the settings bellow.


### APIs

The two Google Apps project will need to have the following Google API enabled
("API & Auth" > "APIs"):

- "Admin SDK"
- "Google+ Domains API"
- "Google Apps Marketplace SDK" (not "Google Apps Marketplace")


### Domain API

You will also need to enable API access on the domain admin console:
- loging at [https://admin.google.com/](https://admin.google.com/) ;
- click "More Control";
- then "Security";
- then "API Reference"
- and tick "Enable API access".


### APIs clients id

For each Google Apps project you will need to create and download 2 set of
API client secrets.

Go to [https://console.developers.google.com/](https://console.developers.google.com/),
select project for the Google Apps Dashboard app and go to "API & Auth" > "Credentials".

You should first create Web application client:

- Push "Create new Client ID";
- "APPLICATION TYPE" should be "Web application";
- "AUTHORIZED JAVASCRIPT ORIGINS" should list the following addresses
(one per line): 
  * http://localhost:8080
  * https://localhost:8080
  * https://student-dashboard.appspot.com
  * https://1-dot-student-dashboard.appspot.com
  * https://development-dot-student-dashboard.appspot.com
- "AUTHORIZED REDIRECT URI" should be set to:
   * http://localhost:8080/api/oauth2callback
  * https://localhost:8080/api/oauth2callback
  * https://student-dashboard.appspot.com/api/oauth2callback
  * https://1-dot-student-dashboard.appspot.com/api/oauth2callback
  * https://development-dot-student-dashboard.appspot.com/api/oauth2callback


Push "Create client ID". It should add a new client id to the list
(with heading set to "Client ID for web application"). Push its "Download JSON"
button, save the file and rename it "dashboard_client.json".

Now you should create a service account client:
- Push "Create new Client ID";
- "APPLICATION TYPE" should be "Service account";

Push "Create client ID". It should add a new client id to the list and
automatically download the secret details. Rename it
"dashboard_service_account.json".

Repeat the process for the LIFT project.


## Installation


### Google App Engine

The back end will run on Google App Engine.

Install the Google Cloud SDK:
```
curl https://sdk.cloud.google.com | bash
```
When prompted to install Google App Engine SDK, select the Python/PHP SDK.

You should now restart your terminal or reload `.bashrc`/`.bash_profile`:
```
. ~/.bashrc
. ~/.bash_profile
```


### Back-end and GUI source code

Clone the repository, initialize its submodules and
create a Python virtual environment:

```
git clone git@github.com:SingaporeClouds/education.git
cd education
make submodules
make setup-dev
```

You need to copy into the `src/secrets/` and the API client secrets downloaded
earlier. Assuming the secrets were saved in `~/Downloads/`:
```
cp ~/Downloads/dashboard_client.json ./src/secrets
cp ~/Downloads/dashboard_service_account.json ./src/secrets
cp ~/Downloads/lift_client.json ./src/secrets
cp ~/Downloads/lift_service_account.json ./src/secrets
```

### Back-end settings

- Open `src/app.yaml` to set `application`. It should be set to the back-end
Project ID.
- Rename `src/appengine_config.py.tmpl` to `src/appengine_config.py`.
- Open `src/appengine_config.py` to set:
  * `educationcore_VALID_DOMAINS`. White list of domain a user can log from,
    with their domain admin email. It should be a dict, domain -> email.
  * `educationdashboardservices_ROSH_REVIEW_API_KEY`
  * `educationdashboardservices_FIRST_AID_AUTH_ID`
  * `educationdashboardservices_FIRST_AID_AUTH_PW`


### Back-end deployment

```
make deploy
```

Google app engine allows you to deploy multiple versions which live on their own
subdomaine.

A version called "development" would be served at
[http://development.student-dashboard-660.appspot.com/](http://development.student-dashboard-660.appspot.com/).

To deploy to the development version:
```
make deploy appversion="development"
```


### Google Apps deployment


The Google Apps Market console allows to test a Google App install process.
It doesn't just test the process, it actually install the Google App on your
domain. We can use it to install the App without publishing it on the Google
App Marketplace.

You should make sure to be logged on an account with admin permission on the
[project console](https://console.developers.google.com/) and the
[domain console](http://admin.google.com). If you are logged on
Google multiple accounts, make sure the primary account has the admin
permission; the [project console](https://console.developers.google.com/)
and [domain console](http://admin.google.com) support multiple accounts but
the App Market console might not (if it does, the feature allowing to
test installation doesn't appear to support switching account).

In any doubt, logged off and log again with your admin account.

#### Google Apps Market console

For each Google Apps project, go to:
- [project console](https://console.developers.google.com/) and select the
project for the student dashboard.
- on the side menu click "API & AUTH" > "APIs"
- Google Apps Marketplace SDK should be enable and beside its name, there
should be bolt icon; click it. It should open the Google Apps Marketplace SDK
console.


You should then fill some of the missing fields. (In the value given below,
you should replace `student-dashboard-660` with your own back-end Project ID).


Application Details:

- "Application Description" input ("A student dashboard" for example)
- the 4 "Application Icon" inputs. You can use the icons from `icons/`.
- set "Support Urls" > "Terms Of Service Url" with `http://student-dashboard-660.appspot.com/terms.html`


Application Oauth2 Scopes:

- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`

Those scopes should be added if not already in the list.


Extensions:

- tick "Enable Universal Navigation extension".
- Set the URL field that should appear bellow with
`http://student-dashboard-660.appspot.com/dashboard/` for the dashboard app or
`http://student-dashboard-660.appspot.com/lift/` for the lift app.

Click "Save Changes".


#### Install flow

It may take a few second, but at the top of the page, there should be a blue Botton
named "TEST INSTALL FLOW".

If it doesn't appear:
- Close all windows.
- log on the [domain console](http://admin.google.com).
- log on the [project console](https://console.developers.google.com/).
- select project for the student dashboard.
- on the side menu click "API & AUTH" > "APIs"
- click the "Google Apps Marketplace SDK" bolt icon.

After reloading the Google Apps Market console, the "TEST INSTALL FLOW" button
should be there.

Click it and start the installation process:

- Accept the grant permission to the app.
- The app should be now be installed.
- Do not launch the app yet when a prompt offers you to open it.


You need the install both Google Apps.


#### Launch the app

The apps should be available using the Universal Navigation pad beside you
login account detail at the top right corner of most Google services:

- click the Universal Navigation pad;
- click "more";
- Student Dashboard should be at the bottom.
- Click it to launch it.

Note it may take 24h for the icons to appear in the apps. (it should right away
appear on your domain account for the [admin console](http://admin.google.com)).
