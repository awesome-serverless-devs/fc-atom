# 写在前头
注意：
1. 启动端口一定要和 caPort 配置端口一致，caPort 默认是 9000
2. 启动不要使用127.0.0.1 要使用、使用、用[0.0.0.0](https://help.aliyun.com/document_detail/132044.html#title-gor-w3v-hee) 启动

# 安装启动 django

初始化 django

````
$ pip3 install django

$ django-admin startproject examples

$ python3 manage.py runserver 9000
````

创建的应用：blog

````
$ python3 manage.py startapp blog
````

编写 models.py 文件

````
from django.db import models

# Create your models here.
class Category(models.Model):
  """
  Django 内置的全部类型可查看文档：
  https://docs.djangoproject.com/en/1.10/ref/models/fields/#field-types
  """
  name = models.CharField(max_length=100)
  excerpt = models.TextField(max_length=200, blank=True)

  def __str__(self):
    return self.title
````

编写好models.py后，建立数据库表
````
# 在settings 文件中的 INSTALLED_APPS字段增加配置：blog （应用名称）
$ python3 manage.py makemigrations
````

创建数据库
````
$ python3 manage.py migrate
````

创建一个超级管理员
````
$ python3 manage.py createsuperuser

Username: ********
Email address:
Password: ********
````

重新启用应用
````
$ python3 manage.py runserver 0.0.0.0:9000

$ http://127.0.0.1:9000/admin/
````

s cp -r ./examples/settings.py nas:///django/examples/settings.py


安装依赖

````
$ pip3 freeze > requirements.txt

$ pip3 install -t ./tmp -r requirements.txt
````