#!/usr/bin/env python
# Takes one argument, the name of the app to build.
# Needs dev server running on port 8080 to pull rendered index file from
import subprocess
import sys
import os
import dotenv

#import ipdb;ipdb.set_trace()
dotenv.load_dotenv(dotenv.find_dotenv())

build_type = os.environ.get("BUILD_TYPE","release")
gokart_url = os.environ.get("GOKART_URL","") or "http://127.0.0.1:8080/"
if gokart_url[-1:] != "/":
    gokart_url = "{}/".format(gokart_url)

keystore,keystore_password,key_alias,key_password = [os.environ.get(f,"").strip() or None for f in ["KEYSTORE","KEYSTORE_PASSWORD","KEY_ALIAS","KEY_PASSWORD"]]
platforms = [p.strip().lower() for p in (os.environ.get("PLATFORMS","").strip() or "android,ios").split(",") if p.strip()]
cordova_cmd = os.environ.get("CORDOVA_CMD","").strip() or "build"

base_dir = os.path.dirname(__file__)
cordova_index_file = os.path.join(base_dir,"www/gokart.html")
cordova_dist_dir = os.path.join(base_dir,"www/dist")
build_sh = os.path.join(base_dir,".build.sh")

app = "sss"
source_dist_dir = os.path.join(base_dir,build_type)

def setUp():
    #retrieve the gokart html from local server;
    print "Begin to load gokart source code form web server"
    returncode = subprocess.call(['wget', 'localhost:8080/{}'.format(app), '-O', cordova_index_file])
    if returncode != 0:
        raise "Fail to load gokart source code from web server"
    with open(cordova_index_file,'rb') as f:
        file_content = f.read()
    print "Succeed to load gokart source code from web server"
    
    
    print "Begin to transform the source code to corvoda gokart html"
    #put original body into template tag.
    file_content = file_content.replace("<body>","<body>\n<script type=\"text/template\" id=\"\">")
    file_content = file_content.replace("</body>","</script>\n</body>")
    #inject cordova related javascript into html
    cordova_js = """
      <script type="text/javascript" src="js/patch.js"></script>
    </body>
    """
    file_content = file_content.replace("</body>",cordova_js)
    with open(cordova_index_file,'wb') as f:
        f.write(file_content)
    print "Succeed to transform the source code to corvoda gokart html"
    
    
    print "Begin to add gokart dependentent static resource into corvoda project."
    #copy related javascript files, staic files and 
    returncode = subprocess.call(["rm","-rf" ,cordova_dist_dir])
    if returncode != 0:
        raise "Fail to add gokart dependentent static resource into corvoda project."
    returncode = subprocess.call(["cp","-rL",source_dist_dir, cordova_dist_dir])
    if returncode != 0:
        raise "Fail to add gokart dependentent static resource into corvoda project."
    print "Succeed to add gokart dependentent static resource into corvoda project."
    
    
    #build 
    with open(build_sh,"wb") as f:
        for platform in platforms:
            cmd = ['cordova',cordova_cmd,platform]
            if build_type == "release":
                cmd.append("--release")
            else:
                cmd.append("--debug")
            if keystore and key_alias:
                cmd += ["--","--keystore=",keystore,"--alias",key_alias]
                if keystore_password:
                    cmd += ["--storePassword",keystore_password]
                if key_password:
                    cmd += ["--password",key_password]
            f.write(" ".join(cmd))
            f.write("\n")
    
    subprocess.call(["chmod","733",build_sh])

def tearDown():
    if os.path.exists(build_sh):
        os.remove(build_sh)

if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[2] not in ["setUp",'tearDown']:
        raise Exception("python build.py [app] [(setUp)(tearDown)]")

    app = sys.argv[1]

    if sys.argv[2] == 'setUp':
        setUp()
    else:
        tearDown()
