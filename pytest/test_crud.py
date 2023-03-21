import pytest
import os
import sys
import glob
import requests
import subprocess
from pathlib import Path

semconrepo = os.getenv('SEMCONREPO') or "http://localhost:3500" # "https://playground.data-container.net"
os.environ["SEMCONREPO"] = semconrepo
oydidcmd = os.getenv('OYDIDCMD') or "oydid"
os.environ["OYDIDCMD"] = oydidcmd
semconcmd = os.getenv('SEMCONCMD') or "semcon"
os.environ["SEMCONCMD"] = semconcmd

def test_repo():
    response = requests.get(semconrepo + "/version")
    assert response.status_code == 200
    print("hello")

# test groups
# 01 - general CRUD tests

# doc: https://pypi.org/project/pytest-subprocess/
# install: pip3 install pytest-subprocess
cwd = os.getcwd()
print(cwd)
@pytest.mark.parametrize('input',  sorted(glob.glob(cwd+'/01_input/*.doc')))
def test_01(fp, input):
    fp.allow_unregistered(True)
    with open(input) as f:
        content = f.read()
    with open(input.replace(".doc", ".cmd")) as f:
        command = f.read()
    with open(input.replace("_input/", "_output/")) as f:
        result = f.read()
    if len(content) > 0:
        command = "cat " + input + " | " + command
    process = subprocess.run(command, shell=True, capture_output=True, text=True)
    assert process.returncode == 0
    if len(result) > 0:
        assert process.stdout.strip() == result.strip()
