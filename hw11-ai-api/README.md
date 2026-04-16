build
```bash
docker build . -t ctnelson1997/cs571-s26-hw11-ai-api
docker push ctnelson1997/cs571-s26-hw11-ai-api
```

run
```bash
docker pull ctnelson1997/cs571-s26-hw11-ai-api
docker run --name=cs571_s26_hw11_ai_api -d --restart=always -p 58111:58111 -v /cs571/s26/hw11-ai-api:/cs571 ctnelson1997/cs571-s26-hw11-ai-api
```

