# B1-RU 生产镜像（交付单元；离线安装流程见 deploy/README.md——docker save/load）
# 构建上下文 = 仓库根（deploy/docker-compose.yml 指定；.dockerignore 在根）
# PYTHON_IMAGE 可参替（构建环境无 3.13 基础镜像时可用 3.12——Django 5.0 均支持）
ARG PYTHON_IMAGE=python:3.13-slim
FROM ${PYTHON_IMAGE}
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# 依赖先行层（requirements 变更才重装）
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
COPY deploy/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
# collectstatic 在构建期完成（开发档默认配置即可运行——不触 DB；生产配置在运行期注入）
RUN python manage.py collectstatic --noinput

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
