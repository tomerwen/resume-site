This is a site to show my resume and practical technical knowledge.

As a repo im using github, i created only 1 repo even though its usually not best practice, but specifically for this project and since i dont need 100% availability, and this is not production i've allowed myself the comfortability of using 1 repo.


CI process: Running in github actions.
Version syntax: "feat:" version x.+1.x . "!" version +1.x.x  . "fix:" version x.x.+1

steps:
1. when push to main -> if change in site or docker
2. create image
3. test connectivity to site
4. push image to dockerhub