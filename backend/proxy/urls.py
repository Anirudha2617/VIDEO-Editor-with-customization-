
from django.urls import path
from .views import media_proxy

urlpatterns = [
    path('proxy', media_proxy, name='media_proxy'),
]
