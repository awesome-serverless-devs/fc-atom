from django.shortcuts import render, HttpResponse
from blog.models import Category

# Create your views here.
def get_category(request):
  querys = Category.objects.all()

  return HttpResponse(querys)
