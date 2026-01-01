# ArgoCD GitOps Setup

This directory contains Kubernetes manifests for deploying the resume site using ArgoCD.

## How It Works

1. **CI Pipeline** (GitHub Actions):
   - Builds Docker image
   - Tests the image
   - Pushes to DockerHub with version tag
   - Updates `k3s/namespaces/resume/deployment.yaml` with the new image tag
   - Commits the change back to Git

2. **ArgoCD**:
   - Watches the Git repository
   - Detects changes to the deployment manifest
   - Automatically syncs and deploys the new image to the cluster

## Setup Instructions

### 1. Update ArgoCD Application

Edit `k3s/namespaces/argocd/application.yaml` and update:
- `repoURL`: Your GitHub repository URL
- `targetRevision`: Your default branch (main or master)

### 2. Apply ArgoCD Application

```bash
kubectl apply -f k3s/namespaces/argocd/application.yaml
```

### 3. Initial Deployment

The deployment will use a placeholder image initially. After the first CI run:
- The deployment manifest will be updated with the actual image
- ArgoCD will automatically sync and deploy

## Files

- `namespaces/argocd/application.yaml`: ArgoCD Application definition
- `namespaces/resume/deployment.yaml`: Kubernetes Deployment and Service manifests

## Image Update Flow

```
Code Push → CI Builds Image → Push to DockerHub → Update Git → ArgoCD Syncs → Deploy
```

The deployment uses version tags (e.g., `v1.2.3`) for better traceability, with `latest` also available.

